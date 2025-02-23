import { App, Editor, Notice, Plugin, PluginSettingTab, Setting, debounce } from 'obsidian';

interface AnchorDisplayTextSettings {
	includeNoteName : string;
	whichHeadings: string;
	includeNotice: boolean;
	sep : string;
}

const DEFAULT_SETTINGS: AnchorDisplayTextSettings = {
	includeNoteName: 'headersOnly',
	whichHeadings: 'allHeaders',
	includeNotice: false,
	sep: ' '
}

export default class AnchorDisplayText extends Plugin {
	settings: AnchorDisplayTextSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new AnchorDisplayTextSettingTab(this.app, this));

		// look for header link creation
		this.registerEvent(
			this.app.workspace.on('editor-change', debounce((editor: Editor) => {
				// Only process if the last typed character is ']'
				const cursor = editor.getCursor();
				const currentLine = editor.getLine(cursor.line);
				const lastChar = currentLine[cursor.ch - 1];
				
				if (lastChar !== ']') return;
				
				// get what is being typed
				const headerLinkPattern = /\[\[([^\]]+#[^|]+)\]\]/;
				const match = currentLine.slice(0, cursor.ch).match(headerLinkPattern);
				if (match) {
					// handle multiple subheadings
					const headings = match[1].split('#')
					let displayText = ''
					if (this.settings.whichHeadings === 'lastHeader') {
						displayText = headings[headings.length - 1];
					} else {
						displayText = headings[1];
						if (this.settings.whichHeadings === 'allHeaders') {
							for (let i = 2; i < headings.length; i++) {
								displayText += this.settings.sep + headings[i];
							}
						}
					}
					const startIndex = (match.index ?? 0) + match[0].length - 2;
					// add note name to display text if wanted
					if (this.settings.includeNoteName === 'noteNameFirst') {
						displayText = `${headings[0]}${this.settings.sep}${displayText}`;
					} else if (this.settings.includeNoteName === 'noteNameLast') {
						displayText = `${displayText}${this.settings.sep}${headings[0]}`;
					}

					if (displayText.startsWith('^')) {
						displayText = displayText.slice(1);
					}

					// change the display text of the link
					editor.replaceRange(`|${displayText}`, {line: cursor.line, ch: startIndex}, undefined, 'headerDisplayText');
					if (this.settings.includeNotice) {
						new Notice (`Updated anchor link display text.`);
					}
				}
			}, 150)) // 150ms debounce
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

class AnchorDisplayTextSettingTab extends PluginSettingTab {
	plugin: AnchorDisplayText;

	constructor(app: App, plugin: AnchorDisplayText) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Include note name')
			.setDesc('Include the title of the note in the display text.')
			.addDropdown(dropdown => {
				dropdown.addOption('headersOnly', 'Don\'t include note name');
				dropdown.addOption('noteNameFirst', 'Note name and then heading(s)');
				dropdown.addOption('noteNameLast', 'Heading(s) and then note name');
				dropdown.setValue(this.plugin.settings.includeNoteName);
				dropdown.onChange(value => {
					this.plugin.settings.includeNoteName = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName('Include subheadings')
			.setDesc('Change which headings and subheadings are in the display text.')
			.addDropdown(dropdown => {
				dropdown.addOption('allHeaders', 'All linked headings');
				dropdown.addOption('lastHeader', 'Last heading only');
				dropdown.addOption('firstHeader', 'First heading only');
				dropdown.setValue(this.plugin.settings.whichHeadings);
				dropdown.onChange(value => {
					this.plugin.settings.whichHeadings = value;
					this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName('Seperator')
			.setDesc('Choose what to insert between headings instead of #.')
			.addText(text => {
				text.setValue(this.plugin.settings.sep);
				text.onChange(value => {
					this.plugin.settings.sep = value;
					this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Enable notifications')
			.setDesc('Have a notice pop up whenever an anchor link is automatically changed.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.includeNotice);
				toggle.onChange(value => {
					this.plugin.settings.includeNotice = value;
					this.plugin.saveSettings();
				});
			});
	}
}