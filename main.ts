import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class ProfileBuilder extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('square-user-round', 'Get Profile', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) { // if a file is opened on screen
				const editor = activeView.editor;
				const selectedText = editor.getSelection(); // get the text selected in the editor
				if (selectedText.length === 0) {
					new Notice('No text selected');
					return;
				} else {
					new Notice(`Getting profile information for ${selectedText}`);
					const profileInfo = await this.getProfileInfo(selectedText);
					editor.replaceRange(profileInfo, editor.getCursor());
					new Notice('Profile information inserted');
				}
			} else {
				new Notice('No file opened');
			}
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		this.addCommand({
			id: 'get-profile-info',
			name: 'Get and insert profile information',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				editor.replaceRange('Some text', editor.getCursor());
				// Do something with the selection
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getProfileInfo(userSelection: string) {
		// Try changing this to a google search for the linkedin, downloading the page, using an AI to parse the information?
		const body = {
			"model":"llama-3.1-sonar-huge-128k-online",
			"messages":
			[
				{
					"role":"system",
					"content":"Find the academic and work experience of the given person. Output the information in this structured, Markdown format: ##Background###Work###Education. Each section should just be a list of experiences noting the company and position for work or degree and field of study for education. At the end of each item should be the start and end date. If the end date is not available, just put the start date. If the start date is not available, just put the end date. If both are not available, just put 'N/A'. After these two sections, you may include anything else you find about the person."
				},
				{
					"role":"user",
					"content":`Tell me about ${userSelection}`
				}
			],
			"search_domain_filer": ["linkedin.com"]
		}
		const options = {
			method: 'POST',
			headers: {Authorization: `Bearer ${process.env.PPLX_API_KEY}`, 'Content-Type': 'application/json'},
			body: JSON.stringify(body)
		  };
		try {
			const response = await fetch('https://api.perplexity.ai/chat/completions', options);
			const data = await response.json();
			return data.choices[0].message.content;
		} catch (err) {
			return err.message;
		}
	} 
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ProfileBuilder;

	constructor(app: App, plugin: ProfileBuilder) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
