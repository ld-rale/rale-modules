"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const vscode_1 = require("vscode");
const { exec } = require('child_process');
let PATH_TO_AST_PARSERS = __dirname; // put AST parsers in out folder
class HighlightLocation {
    constructor(lineno, col_offset, col_offset_end, pattern) {
        this.lineno = lineno;
        this.col_offset = col_offset;
        this.col_offset_end = col_offset_end;
        this.pattern = pattern;
    }
}
function highlightDesignPatterns2(activeEditor, lineno, col_offset, col_offset_end, file_name) {
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
    activeEditor.setDecorations(decorationType, [rangeOption]);
}
function highlightDesignPatterns(pattern) {
    if (pattern == "mixin")
        return "Mixins let a class adopt methods and attributes of another class.";
    if (pattern == "prop_method")
        return "Instances of some classes may have used this Mixin method / property.";
    if (pattern == "adopters")
        return "Mixins let a class adopt methods and attributes of another class.";
    if (pattern == "model")
        return "MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view. Nuances and examples:";
    if (pattern == "view")
        return "MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view. Nuances and examples:";
    return "some pattern definition";
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    let activeEditor = vscode.window.activeTextEditor;
    let to_highlight = {};
    if (activeEditor) {
        let source_code_path = activeEditor.document.uri.fsPath;
        let wfs = vscode.workspace.workspaceFolders;
        let wf = "";
        if (wfs) {
            wf = wfs[0].uri.path;
        }
        // we need to pass in the repository path
        exec('python3 ' + PATH_TO_AST_PARSERS + '/parser-py.py ' + source_code_path + " " + wf, (err, stdout, stderr) => {
            let stdout_lines = stdout.split("\n");
            let opened = [];
            for (let i = 0; i < stdout_lines.length; i++) {
                try {
                    let components = stdout_lines[i].split("Need2highlight ");
                    let pattern = components[0].trim();
                    let main_components = components[1].split(" ");
                    let lineno = Number(main_components[0]);
                    let col_offset = Number(main_components[1]);
                    let col_offset_end = Number(main_components[2]);
                    let file_name = main_components[3];
                    if (file_name.includes("test_")) {
                        continue; // skip test files
                    }
                    if (to_highlight[file_name]) {
                        to_highlight[file_name].push(new HighlightLocation(lineno, col_offset, col_offset_end, pattern));
                    }
                    else {
                        to_highlight[file_name] = [new HighlightLocation(lineno, col_offset, col_offset_end, pattern)];
                    }
                    console.log("lineno, col_offset, col_offset_end, file_name, pattern", lineno, col_offset, col_offset_end, file_name, pattern);
                    if (!opened.includes(file_name)) {
                        opened.push(file_name);
                        vscode.workspace.openTextDocument(vscode.Uri.file(file_name)).then(document => vscode.window.showTextDocument(document).then(document => {
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
        // on opening of documents
        vscode.workspace.onDidOpenTextDocument((d) => {
            console.log("[Document Opened]:" + d.fileName);
            let fileName_trim = d.fileName;
            if (d.fileName.includes(".git")) {
                fileName_trim = d.fileName.substring(0, d.fileName.length - 4);
            }
            if (to_highlight[fileName_trim]) {
                let activeEditor = vscode.window.activeTextEditor;
                if (activeEditor) {
                    let to_hl_list = to_highlight[fileName_trim];
                    for (let i = 0; i < to_hl_list.length; i++) {
                        let hl_loc = to_hl_list[i];
                        highlightDesignPatterns2(activeEditor, hl_loc.lineno, hl_loc.col_offset, hl_loc.col_offset_end, d.fileName);
                    }
                }
            }
        });
        // on hovering within documents
        vscode.languages.registerHoverProvider('python', {
            provideHover(document, position, token) {
                console.log("in provideHover, dpt:", document, position, token, document.uri.path);
                let range = document.getWordRangeAtPosition(position);
                let word = document.getText(range);
                let th = to_highlight[document.uri.path];
                console.log("th", th);
                for (let i = 0; i < th.length; i++) {
                    let highlight_able = th[0];
                    if (position.line == highlight_able.lineno - 1) {
                        let pattern_instance_name = highlight_able.pattern.split(" ")[0];
                        let pattern_name = highlight_able.pattern.split(" ")[1];
                        return new vscode.Hover("pattern definition of " + highlightDesignPatterns(pattern_name));
                    }
                }
            }
        });
    }
    let disposable = vscode.commands.registerCommand('ralemodules.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from RALEModules5!');
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map