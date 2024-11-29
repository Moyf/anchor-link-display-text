import { App, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface HeaderDisplayTextSettings {
	displayTextFormat: string;
	includeNotice: boolean;
	noticeText: string;
	sep : string;
}

const DEFAULT_SETTINGS: HeaderDisplayTextSettings = {
	displayTextFormat: 'headerOnly',
	includeNotice: false,
	noticeText: 'Link changed!'
	sep: ' '
}

export default class HeaderDisplayText extends Plugin {
	settings: HeaderDisplayTextSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new HeaderDisplayTextSettingTab(this.app, this));

		// look for header link creation
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				// get what is being typed
				const cursor = editor.getCursor();
				const currentLine = editor.getLine(cursor.line);
				// match links to other note headings WITHOUT an already defined display text
				const headerLinkPattern = /\[\[([^\]]+#[^|]+)\]\]/;
				const match = currentLine.slice(0, cursor.ch).match(headerLinkPattern);
				if (match) {
					// handle multiple subheadings
					const headings = match[1].split('#')
					let displayText = headings[1]
					for (let i = 2; i < headings.length; i++) {
						displayText += this.settings.sep + headings[i]
					}
					const startIndex = (match.index ?? 0) + match[0].length - 2;
					if (this.settings.displayTextFormat === 'headerOnly') {
						editor.replaceRange(`|${displayText}`, {line: cursor.line, ch: startIndex}, undefined, 'headerDisplayText')
					} else if (this.settings.displayTextFormat === 'withNoteName'){
						editor.replaceRange(`|${headings[0]}${this.settings.sep}${displayText}`, {line: cursor.line, ch: startIndex}, undefined, 'headerDisplayText')
					}
					if (this.settings.includeNotice) {
						new Notice ('Link changed!')
					}
				}
			})
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

class HeaderDisplayTextSettingTab extends PluginSettingTab {
	plugin: HeaderDisplayText;

	constructor(app: App, plugin: HeaderDisplayText) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName('Display Text Format')
			.setDesc('Change the format of the auto populated display text.')
			.addDropdown(dropdown => {
				dropdown.addOption('headerOnly', 'Header Only');
				dropdown.addOption('withNoteName', 'Note Name and Header');
				dropdown.onChange(value => {
					this.plugin.settings.displayTextFormat = value;
					this.plugin.saveSettings();
				});
			})
		new Setting(containerEl)
			.setName('Notifications')
			.setDesc('Have a notification pop up whenever a link is automatically changed.')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.includeNotice);
				toggle.onChange(value => {
					this.plugin.settings.includeNotice = value;
					this.plugin.saveSettings();
				});
			})
	}
}