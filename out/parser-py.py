import ast
from email.mime import base
from multiprocessing.dummy import Array
import sys
import os
from dataclasses import dataclass
from tokenize import String

# python3 out/parser-py.py /Users/gobidasu/Desktop/rale-modules/posthog/posthog/api/routing.py /Users/gobidasu/Desktop/rale-modules/posthog/

print("\n") 
file_to_parse = sys.argv[1]
folder_to_parse = sys.argv[2]
print("file_to_parse: ", file_to_parse)
print("folder_to_parse: ", folder_to_parse)
print("\n")

class PatternArtifact:
    def __init__(self, lineno, col_offset, end_col_offset): # add the file to all these
        self.lineno = lineno
        self.col_offset = col_offset
        self.end_col_offset = end_col_offset
        
class Mixin(PatternArtifact):
    def __init__(self, lineno, col_offset, end_col_offset):
        super().__init__(lineno, col_offset, end_col_offset)        
        self.prop_methods = []
        self.adopters = []

class PropMethod(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset):
        super().__init__(lineno, col_offset, end_col_offset)  
        self.name = name

class Model(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset):
        super().__init__(lineno, col_offset, end_col_offset)  
        self.name = name

class View(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset):
        super().__init__(lineno, col_offset, end_col_offset)
        self.name = name

class Template(PatternArtifact):
    def __init__(self, name, lineno=-1, col_offset=-1, end_col_offset=-1):
        super().__init__(lineno, col_offset, end_col_offset)
        self.name = name

# === for mixin pattern ===
MIXINS = {} # keys are the mixin names, values are Mixin objects

# === for mvc pattern ===
MODELS = {} # keys are the model names, values are Model objects
VIEWS = {} # keys are model names, values are View objects
TEMPLATES = {} # keys are template names, values are Template objects 
URLPATTERNS_FILES = [] # files defining urlpatterns 

# === for all patterns === 
AST_TREES = {} # keys are file names, values are AST trees


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
                MIXINS[node.name] = Mixin(node.lineno, node.col_offset, node.end_col_offset)
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "FunctionDef":
                        print("method / property name:", subnode.name, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                        pm = PropMethod(subnode.name, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                        MIXINS[node.name].prop_methods.append(pm)
          
            # === MODEL IDENTIFICATION ===
            is_model = False
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name and type(base_name)==str:
                    if "model" in base_name.lower():
                        is_model = True
            if is_model:
                print(node.name, "is a model", node.lineno, node.col_offset, node.end_col_offset)
                MODELS[node.name] = Model(node.name, node.lineno, node.col_offset, node.end_col_offset)
     
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
                    relevant_view_name = node_name_parts[0]
                    VIEWS[relevant_view_name] = View(relevant_view_name, node.lineno, node.col_offset, node.end_col_offset)
                else:
                    for b in node.bases:
                        base_name = get_base_name(b)
                        if base_name and type(base_name)==str:
                            if "view" in base_name.lower():
                                VIEWS[node.name] = View(node.name, node.lineno, node.col_offset, node.end_col_offset)
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
                            TEMPLATES[node_arg.value] = Template(node_arg.value)
            except:
                pass
            try:
                for kw in node.keywords:
                     if "template_name" in kw.arg:
                         print("template name: ", kw.value.value)
                         TEMPLATES[kw.value.value] = Template(kw.value.value)
                         
            except:
                pass


# === URLS & VIEWS ===
for urlpattern_file in URLPATTERNS_FILES:
    for node in ast.walk(AST_TREES[urlpattern_file]):
        if type(node).__name__== "Call":
            try:
                if "path" in node.func.id:
                    try: 
                        view_part = node.args[1]
                        try:
                            print("view name:", view_part.func.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                            VIEWS[view_part.func.id] = View(view_part.func.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                        except:
                            try:
                                print("view name:", view_part.func.value.id)
                                VIEWS[view_part.func.value.id] = View(view_part.func.value.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                            except:
                                try:
                                    print("view name:", view_part.id)
                                    VIEWS[view_part.id] = View(view_part.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                                except:
                                    try:
                                        print("view name:", view_part.attr)
                                        VIEWS[view_part.attr] = View(view_part.attr, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                                    except:
                                        try:
                                            print("view name:", view_part.func.value.attr)
                                            VIEWS[view_part.func.value.attr] = View(view_part.func.value.attr, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                                        except:
                                            try:
                                                print("view name:", view_part.func.attr)
                                                VIEWS[view_part.func.attr] = View(view_part.func.attr, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                                            except:
                                                pass
                    except:
                        pass   
            except:
                pass


# second pass
for t in AST_TREES:
    for node in ast.walk(AST_TREES[t]):
        if type(node).__name__ == "ClassDef":
            using_mixin = None
            
            # analyze bases
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name in MIXINS:
                    print("view name is using a mixin:", node.name, base_name, node.lineno, node.col_offset, node.end_col_offset)
                    using_mixin = base_name
                    adopting_view = View(node.name, node.lineno, node.col_offset, node.end_col_offset)
                    MIXINS[using_mixin].adopters.append(adopting_view)
            
            # === find the adopted Mixin methods ===
            if using_mixin:
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "Call":
                        try:
                            if subnode.func.attr in MIXINS[using_mixin]["methods"]:
                                print("adopted method:", subnode.func.attr, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                                adopting_method = PropMethod(subnode.func.attr, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                                MIXINS[using_mixin].adopters.append(adopting_method)
                        except:
                            pass
                    if type(subnode).__name__ == "Attribute":
                        try:
                            if subnode.attr in MIXINS[using_mixin]["methods"]:
                                print("adopted property:", subnode.attr, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                                adopting_property = PropMethod(subnode.attr, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                                MIXINS[using_mixin].adopters.append(adopting_property)
                        except:
                            pass

            # === find the model use in views ===

# string search of other file types
for subdir, dirs, files in os.walk(folder_to_parse):
    for file in files:
        if file.lower().endswith(('.html')) or file.lower().endswith(('.tsx')):
            # === SEARCH FOR TEMPLATES ===
            for temp in TEMPLATES:
                if temp in file:
                    print("file is a template: ", file)
                    TEMPLATES[file] = Template(file)
            try:
                file_in_folder = os.path.join(subdir, file)
                r = open(file_in_folder, 'r')
                file_content = r.read()
                # === SEARCH FOR VIEWS === 
                for temp in VIEWS:
                    needle = "/" + VIEWS[temp].name
                    if needle in file_content:
                        print("found", needle, "in", file)
                        print("location, file_content.index", file_content.index(needle))
                        TEMPLATES[needle] = Template(needle, file_content.index)
            except:
                pass

print("Mixins: ", MIXINS)
print("Mixins: ", MIXINS["StructuredViewSetMixin"])
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].lineno)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].col_offset)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].end_col_offset)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].prop_methods)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].prop_methods[0])
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].prop_methods[0].name)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].prop_methods[0].lineno)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].prop_methods[0].col_offset)
print("StructuredViewSetMixin: ", MIXINS["StructuredViewSetMixin"].prop_methods[0].end_col_offset)
print("Models: ", MODELS)
print("Models: ", MODELS["Insight"])
print("Models: ", MODELS["Insight"].name)
print("Models: ", MODELS["Insight"].lineno)
print("Models: ", MODELS["Insight"].col_offset)
print("Models: ", MODELS["Insight"].end_col_offset)
print("VIEWS: ", VIEWS)
print("VIEWS: ", VIEWS["insight"])
print("VIEWS: ", VIEWS["insight"].name)
print("VIEWS: ", VIEWS["insight"].lineno)
print("VIEWS: ", VIEWS["insight"].col_offset)
print("VIEWS: ", VIEWS["insight"].end_col_offset)
print("TEMPLATES: ", TEMPLATES)