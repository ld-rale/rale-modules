"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const vscode_1 = require("vscode");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        let source_code = activeEditor.document.getText();
        console.log("activeEditor.document.getText()", source_code);
        let startLine = 21;
        let startCharacter = 5;
        let endLine = 21;
        let endCharacter = 10;
        let decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: "yellow"
        });
        let rangeOption = new vscode_1.Range(new vscode_1.Position(startLine, startCharacter), new vscode_1.Position(endLine, endCharacter));
        activeEditor.setDecorations(decorationType, [rangeOption]);
    }
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
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map