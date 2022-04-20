import ast
from email.mime import base
import sys
import os

# python3 out/parser-py.py /Users/gobidasu/Desktop/rale-modules/posthog/posthog/api/routing.py /Users/gobidasu/Desktop/rale-modules/posthog/

print("\n") 
file_to_parse = sys.argv[1]
folder_to_parse = sys.argv[2]
print("file_to_parse: ", file_to_parse)
print("folder_to_parse: ", folder_to_parse)
print("\n")

MIXINS = {} # keys are the mixin names, values are the properties / methods and classes that adopt the mixin
MODELS = {} # keys are the model names
VIEWS = set()
AST_TREES = {}
URLPATTERNS_FILES = []
TEMPLATES = set()

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
                AST_TREES[file_in_folder] = t
            except Exception as e:
                print(e)
                print("There was an exception (probably py2) when trying to AST parse: ", file_in_folder)

# first pass
for t in AST_TREES:
    for node in ast.walk(AST_TREES[t]):
        if type(node).__name__ == "ClassDef":

            # === MIXIN IDENTIFICATION ===
            # it seems that Mixin classes are almost always named [Name]Mixin in Python / Django
            # so we decide to make this fuzzy match
            if ("mixin" in node.name.lower()):
                print("\nclass name:", node.name, node.lineno, node.col_offset, node.end_col_offset)
                MIXINS[node.name] = []
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "FunctionDef":
                        print("method / property name:", subnode.name, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                        try: 
                            MIXINS[node.name]["methods"].append(subnode.name)
                        except:
                            MIXINS[node.name] = {"methods": [subnode.name], "adopters": []}
            
            # === MODEL IDENTIFICATION ===
            is_model = False
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name and type(base_name)==str:
                    if "model" in base_name.lower():
                        is_model = True
            if is_model:
                print(node.name, "is a model", node.lineno, node.col_offset, node.end_col_offset)
                MODELS[node.name] = []
            
        # === VIEWS IDENTIFICATION ===
        # classes or functions mentioned in urls (flask case to do based on @register GET / POST)
        try:
            if node.name == "urlpatterns":
                URLPATTERNS_FILES.append(t)
        except:
            pass
        
        if type(node).__name__ == "ClassDef":
            try:
                node_name = node.name.lower()
                if "view" in node_name:
                    node_name_parts = node_name.split("view")
                    VIEWS.add(node_name_parts[0])
                else:
                    for b in node.bases:
                        base_name = get_base_name(b)
                        if base_name and type(base_name)==str:
                            if "view" in base_name.lower():
                                VIEWS.add(node.name)
            except:
                pass
        
        # === TEMPLATES IDENTIFICATION ===
        # for django its template() and the property template_name=string, same in flask
        if type(node).__name__ == "Call":
            try:
                node_name = node.func.id
                if "template" in node_name:
                    for node_arg in node.args:
                        if type(node_arg).__name__ == "Constant":
                            print("constant:", node_arg.value)
                            TEMPLATES.add(node_arg.value)
            except:
                pass
            try:
                for kw in node.keywords:
                     if "template_name" in kw.arg:
                         print("template name: ", kw.value.value)
                         TEMPLATES.add(node_arg.value)
            except:
                pass
        #print("func call:", ast.dump(node))    

# === URLS & VIEWS ===
for urlpattern_file in URLPATTERNS_FILES:
    for node in ast.walk(AST_TREES[urlpattern_file]):
        if type(node).__name__== "Call":
            try:
                if "path" in node.func.id:
                    try: 
                        view_part = node.args[1]
                        try:
                            #print("view name:", view_part.func.id)
                            VIEWS.add(view_part.func.id)
                        except:
                            try:
                                #print("view name:", view_part.func.value.id)
                                VIEWS.add(view_part.func.value.id)
                            except:
                                try:
                                    #print("view name:", view_part.id)
                                    VIEWS.add(view_part.id)
                                except:
                                    try:
                                        #print("view name:", view_part.attr)
                                        VIEWS.add(view_part.attr)
                                    except:
                                        try:
                                            #print("view name:", view_part.func.value.attr)
                                            VIEWS.add(view_part.func.value.attr)
                                        except:
                                            try:
                                                #print("view name:", view_part.func.attr)
                                                VIEWS.add(view_part.func.attr)
                                            except:
                                                pass
                    except:
                        pass   
            except:
                pass

print("VIEWS:", VIEWS)

print("MIXINS:", MIXINS['StructuredViewSetMixin'])

# second pass
for t in AST_TREES:
    for node in ast.walk(AST_TREES[t]):
        if type(node).__name__ == "ClassDef":
            using_mixin = None
            
            # analyze bases
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name in MIXINS:
                    print("model name is using a mixin:", node.name, base_name, node.lineno, node.col_offset, node.end_col_offset)
                    using_mixin = base_name
            
            # === find the adopted Mixin methods ===
            if using_mixin:
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "Call":
                        try:
                            if subnode.func.attr in MIXINS[using_mixin]["methods"]:
                                print("adopted method:", subnode.func.attr, subnode.lineno, node.col_offset, node.end_col_offset)       
                        except:
                            pass
                    if type(subnode).__name__ == "Attribute":
                        try:
                            if subnode.attr in MIXINS[using_mixin]["methods"]:
                                print("adopted property:", subnode.attr, subnode.lineno, node.col_offset, node.end_col_offset) 
                        except:
                            pass

            # === find the model use in views ===
            
