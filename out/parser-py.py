import ast
import sys
import os

print("\n") 
file_to_parse = sys.argv[1]
folder_to_parse = sys.argv[2]
print("file_to_parse: ", file_to_parse)
print("folder_to_parse: ", folder_to_parse)
print("\n")

MIXINS = {} # keys are the mixin names, values are the list of properties and methods
MODELS = {} # keys are the model names

for subdir, dirs, files in os.walk(folder_to_parse):
    for file in files:
        if file.lower().endswith(('.py')):
            file_in_folder = os.path.join(subdir, file)
            try: # still need to cover py2 case
                r = open(file_in_folder, 'r')
                t = ast.parse(r.read())
                #print("ast:", t)
                for node in ast.walk(t):
                    if type(node).__name__ == "ClassDef":
                        print(f'Nodetype: {type(node).__name__:{16}} {node}')
                        print(ast.dump(node))

                        # === MIXIN IDENTIFICATION ===
                        # it seems that Mixin classes are almost always named [Name]Mixin in Python / Django
                        # so we decide to make this fuzzy match
                        if ("mixin" in node.name.lower()):
                            print(file_in_folder)
                            print("\nclass name:", node.name)
                            MIXINS[node.name] = []
                            for subnode in ast.walk(node):
                                if type(subnode).__name__ == "FunctionDef":
                                    print("method / property name:", subnode.name)
                                    MIXINS[node.name].append(subnode.name)
                        
                        # === MODEL IDENTIFICATION ===
                        for b in node.bases:
                            print("class base - b.id", b.id)

            except Exception:
                print("There was an exception when trying to AST parse: ", file_in_folder)
