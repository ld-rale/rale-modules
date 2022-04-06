// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Range, Position } from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	let patterns = [/Mixin/g, /Model/g]
	let patterns_string = ["Mixin", "Model"]
	let patterns_definitions = [
		"Mixins let a class adopt methods and attributes of another class.",
		"MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view."
	]
	let activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		let source_code = activeEditor.document.getText()
		//console.log("activeEditor.document.getText()", source_code)
		
		for (let i=0; i<patterns.length; i++){
			let match;
			let pattern = patterns[i];
			console.log("pattern:", pattern);
			while (match = pattern.exec(source_code)){
				console.log("in while loop")
				var startPos = activeEditor.document.positionAt(match.index);
				var endPos = activeEditor.document.positionAt(match.index + match[0].length);

				let decorationType = vscode.window.createTextEditorDecorationType({
					backgroundColor:"yellow"
				});
				let rangeOption = new Range(startPos, endPos);
				
				activeEditor.setDecorations(decorationType, [rangeOption]);
			}
		}
	}

	vscode.languages.registerHoverProvider('python', {
		provideHover(document, position, token) {
			console.log("in provideHover, dpt:", document, position, token);
			let range = document.getWordRangeAtPosition(position);
			let word = document.getText(range);
			console.log("word", word);
			for (let i=0; i<patterns_string.length; i++){
				if (word.includes(patterns_string[i]))
					return new vscode.Hover(patterns_definitions[i]);
			}
		}
	});	

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ralemodules" is now active2!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ralemodules.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from RALEModules5!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
