import { App, Editor, EditorPosition, EditorSuggest, EditorSuggestTriggerInfo, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface AnchorDisplaySuggestion {
	displayText: string;
	source: string;
}

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
		this.registerEditorSuggest(new AnchorDisplaySuggest(this));

		// look for header link creation
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				// get what is being typed
				const cursor = editor.getCursor();
				const currentLine = editor.getLine(cursor.line);
				// match anchor links WITHOUT an already defined display text
				const headerLinkPattern = /\[\[([^\]]+#[^|\n\r\]]+)\]\]/;
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
					// change the display text of the link
					editor.replaceRange(`|${displayText}`, {line: cursor.line, ch: startIndex}, undefined, 'headerDisplayText');
					if (this.settings.includeNotice) {
						new Notice (`Updated anchor link display text.`);
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

class AnchorDisplaySuggest extends EditorSuggest<AnchorDisplaySuggestion> {
	private plugin: AnchorDisplayText;

	constructor(plugin: AnchorDisplayText) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		const currentLine = editor.getLine(cursor.line);
		// match anchor links, even if they already have a display text
		const headerLinkPattern = /(\[\[([^\]]+#[^\n\r\]]+)\]\])$/;
		// only when cursor is immediately after the link
		const match = currentLine.slice(0, cursor.ch).match(headerLinkPattern);

		if(!match) {
			return null;
		}

		return {
			start: {
				line: cursor.line,
				ch: match.index! + match[1].length - 2, // 2 less to keep closing brackets
			},
			end: {
				line: cursor.line,
				ch: match.index! + match[1].length - 2,
			},
			query: match[2],
		};
	};

	getSuggestions(context: EditorSuggestTriggerInfo): AnchorDisplaySuggestion[] {
		// don't include existing display text in headings
		const headings = context.query.split('|')[0].split('#');

		let displayText = headings[1];
		for (let i = 2; i < headings.length; i++) {
			displayText += this.plugin.settings.sep + headings[i];
		}
		
		const suggestion1: AnchorDisplaySuggestion = {
			displayText: displayText,
			source: 'Don\'t include note name',
		}
		const suggestion2: AnchorDisplaySuggestion = {
			displayText: `${headings[0]}${this.plugin.settings.sep}${displayText}`,
			source: 'Note name and than heading(s)',
		}
		const suggestion3: AnchorDisplaySuggestion = {
			displayText: `${displayText}${this.plugin.settings.sep}${headings[0]}`,
			source: 'Heading(s) and than note name',
		}
		return [suggestion1, suggestion2, suggestion3];
	};

	renderSuggestion(value: AnchorDisplaySuggestion, el: HTMLElement) {
		const suggestionItemModEl = el.createDiv({cls: 'suggestion-item mod-complex'});
		const suggestionContentEl = suggestionItemModEl.createDiv({cls: 'suggestion-content'});
		suggestionContentEl.createDiv({cls: 'suggestion-title', text: value.displayText});
		suggestionContentEl.createDiv({cls: 'suggestion-note', text: value.source});
		// prompt instructions are a child of the suggestion container, which will
		// be the parent of the parent of the parent of the element which gets passed
		// to this function
		const suggestionItemEl = suggestionItemModEl.parentElement
		const suggestionEl = suggestionItemEl!.parentElement;
		const suggestionContainerEl = suggestionEl!.parentElement;
		// only need to render the prompt instructions once, but renderSuggestion gets called 
		// on each suggestion
		if (suggestionContainerEl!.childElementCount < 2) {
			const promptInstructionsEl = suggestionContainerEl!.createDiv({cls: 'prompt-instructions'});
			const instructionEl = promptInstructionsEl.createDiv({cls: 'prompt-instruction'});
			instructionEl.createEl('span', {cls: 'prompt-instruction-command', text:'↵'});
			instructionEl.createEl('span', {text:'to accept'});
		}
	};

	selectSuggestion(value: AnchorDisplaySuggestion, evt: MouseEvent | KeyboardEvent): void {
		const editor = this.context!.editor;
		// if there is already display text, will need to overwrite it
		const displayTextPattern = /\|([^\]]+)/;
		const match = this.context!.query.match(displayTextPattern);
		if (match) {
			this.context!.start.ch = this.context!.start.ch - match[0].length;
		}
		editor.replaceRange(`|${value.displayText}`, this.context!.start, this.context!.end, 'headerDisplayText');
	};
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