import { App, Editor, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface HeaderDisplayTextSettings {
	displayTextFormat: string;
	includeNotice: boolean;
}

const DEFAULT_SETTINGS: HeaderDisplayTextSettings = {
	displayTextFormat: 'headerOnly',
	includeNotice: false
}

export default class HeaderDisplayText extends Plugin {
	settings: HeaderDisplayTextSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HeaderDisplayTextSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor) => {
				// get what is being typed
				const cursor = editor.getCursor();
				const currentLine = editor.getLine(cursor.line);
				// Wikilink format
				// match links to other note headings WITHOUT an already defined display text
				const headerLinkPattern = /\[\[([^\]]+)#([^|]+)\]\]/;
				const match = currentLine.slice(0, cursor.ch).match(headerLinkPattern);
				if (match) {
					const noteName = match[1];
					const heading = match[2];
					const startIndex = (match.index ?? 0) + match[0].length - 2;
					if (this.settings.displayTextFormat === 'headerOnly') {
						editor.replaceRange(`|${heading}`, {line: cursor.line, ch: startIndex}, undefined, 'headerAliases')
					} else if (this.settings.displayTextFormat === 'withNoteName'){
						editor.replaceRange(`|${noteName} ${heading}`, {line: cursor.line, ch: startIndex}, undefined, 'headerAliases')
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
				dropdown.setValue('headerOnly');
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