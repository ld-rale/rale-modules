// USAGE: 1. Open an untitled window. 2. > Developer Reload Window 3. > Hello World 

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Range, Position } from 'vscode';
const { exec } = require('child_process');
let PATH_TO_AST_PARSERS = __dirname // put AST parsers in out folder
let SERVER = "http://127.0.0.1:7000"

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
	if (lineno < 0) {
		sp = new Position(1, 0); // just highlight the first line then 
		ep = new Position(2, 0); 
	} else {
		if (col_offset < 0 || col_offset_end < 0) { // columns not specified, highlight whole line
			sp = new Position(lineno-1, 0);
			ep = new Position(lineno, 0);
		} 
		else {
			sp = new Position(lineno-1, col_offset); 
			ep = new Position(lineno-1, col_offset_end);
		} // highlights for some reason need to be one line offset for vs code
	}

	let decorationType = vscode.window.createTextEditorDecorationType({
		backgroundColor:"gray"
	});
	let rangeOption = new Range(sp, ep);
	activeEditor.setDecorations(decorationType, [rangeOption]);
}

function highlightDesignPatterns(pattern: String, pattern_instance: String, examples_folder: String, pattern_instance_parent: String){
	let BASE_URL = SERVER + "/ralemodules/exercises/?file=" + examples_folder
	if (pattern == "mixin")
		return "Mixins let a class adopt methods and attributes of another class. In this case, other classes may adopt properties or methods from the " + pattern_instance + " class. Mixins are used if you don't want a class to inherit from another class (i.e. be its child class) but you want it to adopt some attributes / methods.";
	if (pattern == "prop_method")
		return "Some classes may use this Mixin method / property.";
	if (pattern == "adopters_view")
		return "Mixins let a class adopt methods and attributes of another class. In this case, the " + pattern_instance + " is adopting methods / attributes from some mixins.";
	if (pattern == "adopters_pm")
		return "In this case, this class is adopting the " + pattern_instance + " method from a mixin (or from multiple mixins running each mixin's version of " + pattern_instance + " one after another).";
	if (pattern == "model")
		return "Below you will find the " + pattern_instance + " Model. \n\n Go to the controller and view/template to do activities 4-5. \n\n Activity 6: Specifically for {{dp.project}}, why is MV* used here over no framework (i.e. mixing data touching, view touching logic like in vanilla PHP https://en.wikipedia.org/wiki/PHP)? " + BASE_URL + "#" + pattern_instance + "-a6";
	if (pattern == "view")
		return "Below you will find the " + pattern_instance + " MV* controller (i.e. 'View' in Django). \n\n Hint 1) look at the URL configuration files (i.e. urls.py) \n\n Hint 2) go to the Network tab in CDT on the URL corresponding to this view, as specified in urls.py.";
	if (pattern == "template")
		return "Below you will find a part of the " + pattern_instance + " MV* view (i.e. 'Template' in Django). There may be other parts -- look around at the other highlighted files.";
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
		let examples_folder = ""

		exec('python3 ' + PATH_TO_AST_PARSERS + '/parser-py.py ' + source_code_path + " " + wf,(err: any, stdout: any, stderr: any) => {
			let stdout_lines = stdout.split("\n")
			let opened: string[] = [];
			for (let i=0; i<stdout_lines.length; i++){
				try {
					if (stdout_lines[i].includes("===project_path===")) {
						examples_folder = stdout_lines[i].substr(19);
						continue;
					}
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
		vscode.languages.registerHoverProvider({ pattern: '**/*.{ts,js,css,tsx,py,html}' }, {
			provideHover(document, position, token) {
				//console.log("in provideHover, dpt:", document, position, token, document.uri.path);
				
				let range = document.getWordRangeAtPosition(position);
				let word = document.getText(range);
				let path_name = document.uri.path;
				if (path_name.includes(".git")) {
					path_name = path_name.substring(0, path_name.length-4);
				}
				let th = to_highlight[path_name];
				let pattern_message = "";
				for (let i = 0; i<th.length; i++){
					let highlight_able = th[i];
					if (position.line == highlight_able.lineno - 1 || position.line == 1 && highlight_able.lineno == -1){
						let pattern_instance_name = highlight_able.pattern.split(" ")[0];
						let pattern_name = highlight_able.pattern.split(" ")[1];
						let pattern_instance_parent = "";
						if (pattern_name  == "prop_method" || pattern_name == "adopters_view" || pattern_name == "adopters_pm"){
							pattern_instance_parent = highlight_able.pattern.split(" ")[2];
						}
						console.log("pattern_instance_name", pattern_instance_name, "pattern_name", pattern_name, "pattern_instance_parent", pattern_instance_parent);
						if (pattern_message == ""){
							pattern_message = highlightDesignPatterns(pattern_name, pattern_instance_name, examples_folder, pattern_instance_parent);
						}
						else {
							let to_add = highlightDesignPatterns(pattern_name, pattern_instance_name, examples_folder, pattern_instance_parent);
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

// this method is called when your extension is deactivated
export function deactivate() {}
