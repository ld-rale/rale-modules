import ast
from email.mime import base
import sys
import os

print("\n") 
file_to_parse = sys.argv[1]
folder_to_parse = sys.argv[2]
print("file_to_parse: ", file_to_parse)
print("folder_to_parse: ", folder_to_parse)
print("\n")

MIXINS = {} # keys are the mixin names, values are the properties / methods and classes that adopt the mixin
MODELS = {} # keys are the model names
AST_TREES = []

def get_base_name(b):
    base_name = None
    try: 
        base_name = b.id 
    except Exception: 
        pass
    try: 
        base_name = b.value
    except Exception: 
        pass                
    try: 
        base_name = b.value.id
    except Exception: 
        pass
    try: 
        base_name = b.func.id
    except Exception: 
        pass
    return base_name

for subdir, dirs, files in os.walk(folder_to_parse):
    for file in files:
        if file.lower().endswith(('.py')):
            file_in_folder = os.path.join(subdir, file)
            try: # still need to cover py2 case
                r = open(file_in_folder, 'r')
                t = ast.parse(r.read())
                AST_TREES.append(t)
            except Exception as e:
                print(e)
                print("There was an exception (probably py2) when trying to AST parse: ", file_in_folder)

# first pass
for t in AST_TREES:
    for node in ast.walk(t):
        if type(node).__name__ == "ClassDef":
            #print(f'Nodetype: {type(node).__name__:{16}} {node}')
            #print(ast.dump(node))

            # === MIXIN IDENTIFICATION ===
            # it seems that Mixin classes are almost always named [Name]Mixin in Python / Django
            # so we decide to make this fuzzy match
            if ("mixin" in node.name.lower()):
                print("\nclass name:", node.name)
                MIXINS[node.name] = []
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "FunctionDef":
                        print("method / property name:", subnode.name)
                        try: 
                            MIXINS[node.name]["methods"].append(subnode.name)
                        except:
                            MIXINS[node.name] = {"methods": [subnode.name], "adopters": []}
            
            # === MODEL IDENTIFICATION ===
            is_model = False
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name and type(base_name)==str:
                    # print("base_name", base_name)
                    if "model" in base_name.lower():
                        is_model = True
            if is_model:
                print(node.name, "is a model")
                MODELS[node.name] = []

# second pass
for t in AST_TREES:
    for node in ast.walk(t):
        if type(node).__name__ == "ClassDef":
            using_mixin = None
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name in MIXINS:
                    print("model name is using a mixin:", node.name, base_name)
                    using_mixin = base_name
            # find the adopted methods
            if using_mixin:
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "Call":
                        #print("subnode name:", ast.dump(subnode))
                        try:
                            if subnode.__attr__ in MIXINS[using_mixin]["methods"]:
                                print("adopted method:", subnode.__attr__)
                        except:
                            #print("call doesn't have an attr prop")
                            pass
