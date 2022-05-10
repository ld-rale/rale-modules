// USAGE: 1. Open an untitled window. 2. > Developer Reload Window 3. > Hello World 

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Range, Position } from 'vscode';
const { exec } = require('child_process');
let PATH_TO_AST_PARSERS = __dirname // put AST parsers in out folder

class HighlightLocation {
	lineno: number;
	col_offset: number;
	col_offset_end: number;
	pattern: String;
	constructor(lineno: number, col_offset: number, col_offset_end: number, pattern:String) {
		this.lineno = lineno;
		this.col_offset = col_offset;
		this.col_offset_end = col_offset_end;
		this.pattern = pattern;
	}
}

function highlightDesignPatterns2(activeEditor: vscode.TextEditor, lineno: number, col_offset: number, col_offset_end: number, file_name: string){
	let sp: Position;
	let ep: Position
	if (col_offset < 0 || col_offset_end < 0) { // columns not specified, highlight whole line
		sp = new Position(lineno-1, 0);
		ep = new Position(lineno, 0);
	} else {
		sp = new Position(lineno-1, col_offset); 
		ep = new Position(lineno-1, col_offset_end); 
	} // highlights for some reason need to be one line offset for vs code

	let decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor:"gray"
	});
	let rangeOption = new Range(sp, ep);
	activeEditor.setDecorations(decorationType, [rangeOption]);
}

function highlightDesignPatterns(pattern: String, pattern_instance: String){
	if (pattern == "mixin")
		return "Mixins let a class adopt methods and attributes of another class. In this case, other classes may adopt properties or methods from the " + pattern_instance + " class. Mixins are used if you don't want a class to inherit from another class (i.e. be its child class) but you want it to adopt some attributes / methods. You can think of mixins as uncles and aunts but not necessarily parents. They help avoid issues and complexities of multiple inheritance (i.e. if class D has parents B and C, both of whose parent is A, then does D use B or C's version of any given method). Tutorial Example: https://www.patterns.dev/posts/mixin-pattern/. \n\n Activity 1: Scan the mixin code below and summarize what you think the Mixin does: [link] \n\n Activity 2: List some classes in this codebase that use this mixin (hint - use VS Code's search feature): [link]";
	if (pattern == "prop_method")
		return "Some classes may use this Mixin method / property. \n\n Activity 3A: List the files + line numbers + classes, where this Mixin's method " + pattern_instance + " is being adopted / used by a class (or class instance) that includes this Mixin. Hint: look at the other highlighted files in the file system. [link] \n\n Activity 3B: Trigger the mixin code (i.e. the 'mixed in' code) below by using the software application, writing print statements, and watching them trigger. [link] \n\n Activity 3C: Describe how this Mixin's " + pattern_instance + " method is being used there. i.e. what does this Mixin's " + pattern_instance + " do? i.e. what does the class that adopts this Mixin's " + pattern_instance + " do? [link]";
	if (pattern == "adopters")
		return "Mixins let a class adopt methods and attributes of another class. In this case, the " + pattern_instance + " is adopting methods / attributes from some mixins. Tutorial Example: https://www.patterns.dev/posts/mixin-pattern/";
	if (pattern == "model")
		return "MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view. Nuances and examples:";
	if (pattern == "view")
		return "MV* (MVC, MVVM, MVP, MVT) divide user interface implemenations into 3 interconnected elements - the model for data related management, the view (or in the case of django the template) for visual representations, and the controller for logic for manipulating the model or view. Nuances and examples:";
	return "some pattern definition";
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let activeEditor = vscode.window.activeTextEditor;
	let to_highlight: { [key: string]: [HighlightLocation] } = {};

	if (activeEditor) {
		let source_code_path = activeEditor.document.uri.fsPath
		let wfs = vscode.workspace.workspaceFolders;
		let wf = "";
		if (wfs) {
			wf = wfs[0].uri.path;
		}
		// we need to pass in the repository path

		exec('python3 ' + PATH_TO_AST_PARSERS + '/parser-py.py ' + source_code_path + " " + wf, (err: any, stdout: any, stderr: any) => {
			let stdout_lines = stdout.split("\n")
			let opened: string[] = [];
			for (let i=0; i<stdout_lines.length; i++){
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
					//console.log("lineno, col_offset, col_offset_end, file_name, pattern", lineno, col_offset, col_offset_end, file_name, pattern);
					if (!opened.includes(file_name)) {
						opened.push(file_name)
					
						vscode.workspace.openTextDocument(vscode.Uri.file(file_name)).then(
							document => vscode.window.showTextDocument(document).then(document => {
								let activeEditor = vscode.window.activeTextEditor;
								if (activeEditor) {
									highlightDesignPatterns2(activeEditor, lineno, col_offset, col_offset_end, file_name);
								}
							})
						); // maybe need to make list of files, and then have them opened auto
					}
				}
				catch {
					console.log("problem parsing out to highlight locations");
				}
			}
		});
		
		// on opening of documents
		vscode.workspace.onDidOpenTextDocument((d)=>{
			console.log("[Document Opened]:" + d.fileName);
			let fileName_trim = d.fileName;
			if (d.fileName.includes(".git")) {
				fileName_trim = d.fileName.substring(0, d.fileName.length-4);
			}
			if (to_highlight[fileName_trim]){
				let activeEditor = vscode.window.activeTextEditor;
				if (activeEditor){
					let to_hl_list = to_highlight[fileName_trim];
					for (let i = 0; i<to_hl_list.length; i++){
						let hl_loc = to_hl_list[i];
						highlightDesignPatterns2(activeEditor, hl_loc.lineno, hl_loc.col_offset, hl_loc.col_offset_end, d.fileName);
					}
				}
			}
		});

		// on hovering within documents
		vscode.languages.registerHoverProvider('python', {
			provideHover(document, position, token) {
				// console.log("in provideHover, dpt:", document, position, token, document.uri.path);
				
				let range = document.getWordRangeAtPosition(position);
				let word = document.getText(range);
				
				let th = to_highlight[document.uri.path];
				for (let i = 0; i<th.length; i++){
					let highlight_able = th[i];
					if (position.line == highlight_able.lineno - 1){
						let pattern_instance_name = highlight_able.pattern.split(" ")[0]
						let pattern_name = highlight_able.pattern.split(" ")[1]
						return new vscode.Hover(highlightDesignPatterns(pattern_name, pattern_instance_name));
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

// this method is called when your extension is deactivated
export function deactivate() {}
