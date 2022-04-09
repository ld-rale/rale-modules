"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const vscode_1 = require("vscode");
const { exec } = require('child_process');
// console.log(`Filename is ${__filename}`);
// console.log(`Directory name is ${__dirname}`);
let PATH_TO_AST_PARSERS = __dirname; // put AST parsers in out folder
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let patterns = [/Mixin/g, /Model/g];
    let patterns_string = ["Mixin", "Model"];
    let patterns_definitions = [
        "Mixins let a class adopt methods and attributes of another class.",
        "MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view."
    ];
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        let source_code = activeEditor.document.getText();
        //console.log("activeEditor.document.getText()", source_code)
        let source_code_path = activeEditor.document.uri.fsPath;
        console.log("activeEditor.document.uri.fsPath()", source_code_path);
        exec('python3 ' + PATH_TO_AST_PARSERS + '/parser-py.py ' + source_code_path, (err, stdout, stderr) => {
            console.log("err:", err);
            console.log("stdout:", stdout);
            console.log("stderr:", stderr);
        });
        for (let i = 0; i < patterns.length; i++) {
            let match;
            let pattern = patterns[i];
            console.log("pattern:", pattern);
            while (match = pattern.exec(source_code)) {
                console.log("in while loop");
                var startPos = activeEditor.document.positionAt(match.index);
                var endPos = activeEditor.document.positionAt(match.index + match[0].length);
                let decorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: "yellow"
                });
                let rangeOption = new vscode_1.Range(startPos, endPos);
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
            for (let i = 0; i < patterns_string.length; i++) {
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
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map