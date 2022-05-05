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
class HighlightLocation {
    constructor(lineno, col_offset, col_offset_end) {
        this.lineno = lineno;
        this.col_offset = col_offset;
        this.col_offset_end = col_offset_end;
    }
}
function highlightDesignPatterns2(activeEditor, lineno, col_offset, col_offset_end, file_name) {
    //console.log("lineno, col_offset, col_offset_end, file_name:", lineno, col_offset, col_offset_end, file_name);
    let sp;
    let ep;
    if (col_offset < 0 || col_offset_end < 0) { // columns not specified, highlight whole line
        sp = new vscode_1.Position(lineno - 1, 0);
        ep = new vscode_1.Position(lineno, 0);
    }
    else {
        sp = new vscode_1.Position(lineno - 1, col_offset);
        ep = new vscode_1.Position(lineno - 1, col_offset_end);
    } // highlights for some reason need to be one line offset for vs code
    let decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: "gray"
    });
    let rangeOption = new vscode_1.Range(sp, ep);
    //console.log("rangeOption", rangeOption);
    activeEditor.setDecorations(decorationType, [rangeOption]);
    vscode.languages.registerHoverProvider('python', {
        provideHover(document, position, token) {
            //console.log("in provideHover, dpt:", document, position, token);
            let range = rangeOption;
            let word = document.getText(range);
            //console.log("word", word);
            return new vscode.Hover("pattern definition ");
        }
    });
}
function highlightDesignPatterns(activeEditor) {
    let patterns = [/Mixin/g, /Model/g];
    let patterns_string = ["Mixin", "Model"];
    let patterns_definitions = [
        "Mixins let a class adopt methods and attributes of another class.",
        "MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view."
    ];
    let source_code = activeEditor.document.getText();
    for (let i = 0; i < patterns.length; i++) {
        let match;
        let pattern = patterns[i];
        //console.log("pattern:", pattern);
        while (match = pattern.exec(source_code)) {
            //console.log("in while loop")
            var startPos = activeEditor.document.positionAt(match.index);
            var endPos = activeEditor.document.positionAt(match.index + match[0].length);
            let decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: "yellow"
            });
            let rangeOption = new vscode_1.Range(startPos, endPos);
            activeEditor.setDecorations(decorationType, [rangeOption]);
        }
    }
    vscode.languages.registerHoverProvider('python', {
        provideHover(document, position, token) {
            //console.log("in provideHover, dpt:", document, position, token);
            let range = document.getWordRangeAtPosition(position);
            let word = document.getText(range);
            //console.log("word", word);
            for (let i = 0; i < patterns_string.length; i++) {
                if (word.includes(patterns_string[i]))
                    return new vscode.Hover(patterns_definitions[i]);
            }
        }
    });
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let activeEditor = vscode.window.activeTextEditor;
    let to_highlight = {};
    if (activeEditor) {
        // console.log("activeEditor.document.getText()", source_code)
        let source_code_path = activeEditor.document.uri.fsPath;
        // console.log("activeEditor.document.uri.fsPath()", source_code_path)
        let wfs = vscode.workspace.workspaceFolders;
        let wf = "";
        if (wfs) {
            wf = wfs[0].uri.path;
            //console.log("wf", wf);
        }
        // we need to pass in the repository path
        exec('python3 ' + PATH_TO_AST_PARSERS + '/parser-py.py ' + source_code_path + " " + wf, (err, stdout, stderr) => {
            //console.log("err:", err);
            //console.log("stdout:", stdout);
            //console.log("stderr:", stderr);
            let stdout_lines = stdout.split("\n");
            let opened = [];
            for (let i = 0; i < stdout_lines.length; i++) {
                try {
                    let components = stdout_lines[i].split("Need2highlight ");
                    let main_components = components[1].split(" ");
                    let lineno = Number(main_components[0]);
                    let col_offset = Number(main_components[1]);
                    let col_offset_end = Number(main_components[2]);
                    let file_name = main_components[3];
                    if (file_name.includes("test_")) {
                        continue; // skip test files
                        //console.log("file_name includes test_", file_name)
                    }
                    if (to_highlight[file_name]) {
                        to_highlight[file_name].push(new HighlightLocation(lineno, col_offset, col_offset_end));
                    }
                    else {
                        to_highlight[file_name] = [new HighlightLocation(lineno, col_offset, col_offset_end)];
                    }
                    console.log("lineno, col_offset, col_offset_end, file_name", lineno, col_offset, col_offset_end, file_name);
                    if (!opened.includes(file_name)) {
                        opened.push(file_name);
                        vscode.workspace.openTextDocument(vscode.Uri.file(file_name)).then(document => vscode.window.showTextDocument(document).then(document => {
                            //console.log("showing document", document);
                            let activeEditor = vscode.window.activeTextEditor;
                            if (activeEditor) {
                                highlightDesignPatterns2(activeEditor, lineno, col_offset, col_offset_end, file_name);
                            }
                        })); // maybe need to make list of files, and then have them opened auto
                    }
                }
                catch {
                    console.log("problem parsing out to highlight locations");
                }
            }
        });
        //highlightDesignPatterns(activeEditor);
        vscode.workspace.onDidOpenTextDocument((d) => {
            console.log("[Document Opened]:" + d.fileName);
            //console.log("to_highlight:", to_highlight);
            let fileName_trim = d.fileName;
            if (d.fileName.includes(".git")) {
                fileName_trim = d.fileName.substring(0, d.fileName.length - 4);
            }
            //console.log("to_highlight[fileName_trim]:", to_highlight[fileName_trim]);
            if (to_highlight[fileName_trim]) {
                //console.log("document is in dictionary");
                let activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    let to_hl_list = to_highlight[fileName_trim];
                    //console.log("to_hl_list", to_hl_list);
                    for (let i = 0; i < to_hl_list.length; i++) {
                        let hl_loc = to_hl_list[i];
                        //console.log("about to highlight:", hl_loc.lineno, hl_loc.col_offset, hl_loc.col_offset_end, d.fileName)
                        highlightDesignPatterns2(activeEditor, hl_loc.lineno, hl_loc.col_offset, hl_loc.col_offset_end, d.fileName);
                    }
                }
            }
        });
    }
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    //console.log('Congratulations, your extension "ralemodules" is now active2!');
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