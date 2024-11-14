import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { WASI } from 'wasi';

// Remember to rename these classes and interfaces!

interface OBCopilotSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: OBCopilotSettings = {
	mySetting: 'default'
}

export default class OBCopilot extends Plugin {
	settings: OBCopilotSettings;

	async onload() {
		await this.loadSettings();

		// 中英混排工具
		this.addCommand({
			id: 'auto-insert-space-between-zh-en',
			name: '中英字符自动空格（Auto Insert Space）',
			editorCallback: (editor: Editor) => this.autoInsertSpace(editor)
		});
		
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

	async autoInsertSpace(editor : Editor) {
		let oldContent = editor.getValue();
		let newContent = "";
		let difContent = "";

		let oldPointer = 0, newPointer = 0;
		let curChar = '', nxtChar = '';
		
		while (oldPointer < oldContent.length) {
			curChar = oldContent[oldPointer];
			nxtChar = oldContent[oldPointer + 1];
			newContent += curChar;
			
			if (nxtChar != undefined) {
				if (((!this.isHalfWidthChar(curChar) && !this.isPunctuation(curChar)) && this.isHalfWidthChar(nxtChar)) || 
				    ((!this.isHalfWidthChar(nxtChar) && !this.isPunctuation(nxtChar)) && this.isHalfWidthChar(curChar))    ) {
					if (curChar != ' ' && nxtChar != ' ') { newContent += ' '; }
				}
			}

			oldPointer++;
		}

		let isDiff = 0, totalDiff = 0;
		oldPointer = 0; newPointer = 0;
		while(oldPointer < oldContent.length) {
			if (oldContent[oldPointer] == newContent[newPointer]) {
				if (isDiff == 0) { difContent += oldContent[oldPointer]; }
				else { difContent += "]==" + newContent[newPointer]; isDiff = 0; totalDiff++; }
				
				oldPointer++; newPointer++;
			} else {
				if (isDiff == 1) { difContent += newContent[newPointer]; }
				else { difContent += "==[" + newContent[newPointer]; isDiff = 1; }

				newPointer++;
			}
		}
		
		editor.setValue(newContent);
		await this.showDiffResult(difContent);

		console.log(difContent);
		new Notice('共计插入空格 ' + totalDiff + ' 组');
		new Notice('自动插入空格完成');
	}

	async showDiffResult(difContent : string) {
		let timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // 格式化时间戳
		let fileName = `对比结果_${timestamp}.md`;
		let file = await this.app.vault.create(fileName, difContent);
		this.app.workspace.getLeaf(true).openFile(file);
	}

	isHalfWidthChar(char : string) : boolean {
		return '·1234567890-=qwertyuiop[]\asdfghjkl;\'zxcvbnm,./~!@#$%^&*()_+QWERTYUIOP{}|ASDFGHJKL:"ZXCVBNM<>?'.includes(char)
	}

	isPunctuation(char : string) : boolean {
		return '！￥…（）—{}【】、：；“”‘’，。、《》？'.includes(char);
	}
}