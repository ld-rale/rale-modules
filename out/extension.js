"use strict";
// USAGE: 1. Open an untitled window. 2. > Developer Reload Window 3. > Hello World 
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const vscode_1 = require("vscode");
const { exec } = require('child_process');
let PATH_TO_AST_PARSERS = __dirname; // put AST parsers in out folder
let SERVER = "localhost:8000";
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
    if (lineno < 0) {
        sp = new vscode_1.Position(1, 0); // just highlight the first line then 
        ep = new vscode_1.Position(2, 0);
    }
    else {
        if (col_offset < 0 || col_offset_end < 0) { // columns not specified, highlight whole line
            sp = new vscode_1.Position(lineno - 1, 0);
            ep = new vscode_1.Position(lineno, 0);
        }
        else {
            sp = new vscode_1.Position(lineno - 1, col_offset);
            ep = new vscode_1.Position(lineno - 1, col_offset_end);
        } // highlights for some reason need to be one line offset for vs code
    }
    let decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: "gray"
    });
    let rangeOption = new vscode_1.Range(sp, ep);
    activeEditor.setDecorations(decorationType, [rangeOption]);
}
function highlightDesignPatterns(pattern, pattern_instance, examples_folder) {
    if (pattern == "mixin")
        return "Mixins let a class adopt methods and attributes of another class. In this case, other classes may adopt properties or methods from the " + pattern_instance + " class. Mixins are used if you don't want a class to inherit from another class (i.e. be its child class) but you want it to adopt some attributes / methods. You can think of mixins as uncles and aunts but not necessarily parents. They help avoid issues and complexities of multiple inheritance (i.e. if class D has parents B and C, both of whose parent is A, then does D use B or C's version of any given method). Tutorial Example: https://www.patterns.dev/posts/mixin-pattern/. \n\n View a diagram of the mixins in this example that we generated: [link] \n\n Activity 1: Scan the mixin code below and summarize what you think the Mixin does: " + SERVER + "/ralemodules/exercises/?file=" + examples_folder + "#mixin-" + pattern_instance + " \n\n Activity 2: List some classes in this codebase that use this mixin (hint - use VS Code's search feature): [link]";
    if (pattern == "prop_method")
        return "Some classes may use this Mixin method / property. \n\n View a diagram of the mixins in this example that we generated: [link] \n\n Activity 3A: List the files + line numbers + classes, where this Mixin's method " + pattern_instance + " is being adopted / used by a class (or class instance) that includes this Mixin. Hint: look at the other highlighted files in the file system. [link] \n\n Activity 3B: Trigger the mixin code (i.e. the 'mixed in' code) below by using the software application, writing print statements, and watching them trigger. [link] \n\n Activity 3C: Describe how this Mixin's " + pattern_instance + " method is being used there. i.e. what does this Mixin's " + pattern_instance + " do? i.e. what does the class that adopts this Mixin's " + pattern_instance + " do? [link]";
    if (pattern == "adopters_view")
        return "Mixins let a class adopt methods and attributes of another class. In this case, the " + pattern_instance + " is adopting methods / attributes from some mixins. Tutorial Example: https://www.patterns.dev/posts/mixin-pattern/ \n\n View a diagram of the mixins in this example that we generated: [link]";
    if (pattern == "adopters_pm")
        return "In this case, this class is adopting the " + pattern_instance + " method from a mixin (or from multiple mixins running each mixin's version of " + pattern_instance + " one after another). \n\n View a diagram of the mixins in this example that we generated: [link] \n\n Activity 4A: Trigger the highlighted code by using the software application, writing print statements, and observing what happens. [link] \n\n Activity 4B: Why are mixins used here - briefly explain. Here are some ideas, but which ones apply in this case? Any other reasons? Why for this particular domain? Hint: Think carefully about the domain / purpose of the application you are studying. [link] \n\n (A) Mixins can be used by multiple classes, for code reusability. They are used to avoid code repetition and promote code reuse, so there is less complexity and room for error. This helps with collaboration. For instance, in https://www.patterns.dev/posts/mixin-pattern/, all animals (dogs, cats, etc) can use the animalFunctionality mixin. \n\n (B) Mixins can be used for adding lots of optional attributes/methods. You may want a class to avail of several optional properties or methods. For instance in the https://stackoverflow.com/a/547714/1194050 example, mixins let you allow more supports as needed, but not by default, to instances of Request. Adding mixins to classes let you layer on additional functionality as needed. Each included mixin's version of any given method (i.e. " + pattern_instance + ") will run. \n\n (C) Compartmentalization: code at different levels (data touching, logic, view touching, etc) should be separated so different developers can collaborate easily. For instance, in https://www.patterns.dev/posts/mixin-pattern/, functionality for animals in general in animalFunctionality can be separated from dog-specific functionality. \n\n Activity 5: Finally complete the design patterns tradeoffs exercise. [link]";
    if (pattern == "model")
        return "MV* (MVC, MVVM, MVP, MVT) divide user interface implementations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view. Nuances and examples: \n\n - https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller \n\n - https://levelup.gitconnected.com/mvc-vs-mvp-vs-mvvm-35e0d4b933b4 \n\n - https://www.geeksforgeeks.org/difference-between-mvc-and-mvt-design-patterns/ \n\n Below you will find the " + pattern_instance + " Model. \n\n View a diagram of the MV* in this example that we generated: [link] \n\n Activity 1: Describe the " + pattern_instance + " model. [link] \n\n Activity 2: Name the file / class that forms the " + pattern_instance + " model's controller (in Django, confusingly, they say 'View' for the MV* controller, and 'Template' for view). [link] \n\n Activity 3: Name the file that corresponds to the " + pattern_instance + " model's view (in Django, confusingly, they say 'Template' for the MV* view) [link] \n\n Go to the controller and view/template to do activities 4-5. \n\n Activity 6: Why is MV* used here over no framework (i.e. mixing data touching, view touching logic like in vanilla PHP https://en.wikipedia.org/wiki/PHP)?";
    if (pattern == "view")
        return "Below you will find the " + pattern_instance + " MV* controller (i.e. 'View' in Django). \n\n View a diagram of the MV* in this example that we generated: [link] \n\n Activity 4: How does this controller access / manipulate the data model (i.e. which line of code)? What data does the model provide the controller? Does the controller also manipulate the model (i.e. create / edit / delete model instances and if so with what information) or is it just read only? [link] \n\n Activity 5: How does the model data get to the view (i.e. template)? What data does the model provide and how does it fill the template? [link] \n\n Hint 1) look at the URL configuration files (i.e. urls.py) \n\n Hint 2) go to the Network tab in CDT on the URL corresponding to this view, as specified in urls.py.";
    if (pattern == "template")
        return "Below you will find a part of the " + pattern_instance + " MV* view (i.e. 'Template' in Django). There may be other parts -- look around at the other highlighted files. \n\n View a diagram of the MV* in this example that we generated: [link] \n\n Activity 7: This is a subjective question, but would you consider these templates MVC, MVVM, MVP, MVT, and why do you think the code architects chose that? Add / update  your answer: [link] \n\n Activity 8: Finally, complete the design patterns tradeoffs exercise. [link]";
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
        let examples_folder = "";
        exec('python3 ' + PATH_TO_AST_PARSERS + '/parser-py.py ' + source_code_path + " " + wf, (err, stdout, stderr) => {
            let stdout_lines = stdout.split("\n");
            let opened = [];
            console.log("stdout_lines", stdout_lines);
            console.log("err", err);
            console.log("stderr", stderr);
            for (let i = 0; i < stdout_lines.length; i++) {
                try {
                    if (stdout_lines[i].includes("===project_path===")) {
                        examples_folder = stdout_lines[i].substr(19);
                        continue;
                    }
                    console.log("got here 1,", i);
                    console.log(stdout_lines);
                    console.log(stdout_lines[i]);
                    let components = stdout_lines[i].split("Need2highlight ");
                    let pattern = components[0].trim();
                    let main_components = components[1].split(" ");
                    let lineno = Number(main_components[0]);
                    let col_offset = Number(main_components[1]);
                    let col_offset_end = Number(main_components[2]);
                    let file_name = main_components[3];
                    console.log("got here 2");
                    if (file_name.includes("test_")) {
                        continue; // skip test files
                    }
                    if (to_highlight[file_name]) {
                        to_highlight[file_name].push(new HighlightLocation(lineno, col_offset, col_offset_end, pattern));
                    }
                    else {
                        to_highlight[file_name] = [new HighlightLocation(lineno, col_offset, col_offset_end, pattern)];
                    }
                    //console.log("lineno, col_offset, col_offset_end, file_name, pattern", lineno, col_offset, col_offset_end, file_name, pattern);
                    console.log("got here 3");
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
        vscode.languages.registerHoverProvider({ pattern: '**/*.{ts,js,css,tsx,py,html}' }, {
            provideHover(document, position, token) {
                //console.log("in provideHover, dpt:", document, position, token, document.uri.path);
                let range = document.getWordRangeAtPosition(position);
                let word = document.getText(range);
                let path_name = document.uri.path;
                if (path_name.includes(".git")) {
                    path_name = path_name.substring(0, path_name.length - 4);
                }
                let th = to_highlight[path_name];
                let pattern_message = "";
                for (let i = 0; i < th.length; i++) {
                    let highlight_able = th[i];
                    if (position.line == highlight_able.lineno - 1 || position.line == 1 && highlight_able.lineno == -1) {
                        let pattern_instance_name = highlight_able.pattern.split(" ")[0];
                        let pattern_name = highlight_able.pattern.split(" ")[1];
                        if (pattern_message == "") {
                            pattern_message = highlightDesignPatterns(pattern_name, pattern_instance_name, examples_folder);
                        }
                        else {
                            let to_add = highlightDesignPatterns(pattern_name, pattern_instance_name, examples_folder);
                            if (!pattern_message.includes(to_add))
                                pattern_message = pattern_message + "\n\n—————————\n\n" + to_add;
                        }
                    }
                }
                return new vscode.Hover(pattern_message);
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