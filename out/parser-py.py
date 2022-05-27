import ast
from email.mime import base
from multiprocessing.dummy import Array
import sys
import os
from dataclasses import dataclass
from tokenize import String
import json
import requests
import csv

# https://docs.python.org/3/library/ast.html
# python3 out/parser-py.py /Users/gobidasu/Desktop/rale-modules/posthog/posthog/api/routing.py /Users/gobidasu/Desktop/rale-modules/posthog/
# needle /insight file /Users/gobidasu/Desktop/rale-modules/posthog/frontend/src/scenes/saved-insights/SavedInsights.tsx

SERVER = "localhost:8000"

print("\n") 
file_to_parse = sys.argv[1]
folder_to_parse = sys.argv[2]
print("file_to_parse: ", file_to_parse)
print("folder_to_parse: ", folder_to_parse)
print("\n")

class PatternArtifact:
    def __init__(self, lineno, col_offset, end_col_offset, file_path): # add the file to all these
        self.lineno = lineno
        self.col_offset = col_offset
        self.end_col_offset = end_col_offset
        self.file_path = file_path

class Mixin(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset, file_path):
        super().__init__(lineno, col_offset, end_col_offset, file_path) 
        self.name = name       
        self.prop_methods = []
        self.adopters = []

class PropMethod(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset, file_path, associated_class):
        super().__init__(lineno, col_offset, end_col_offset, file_path, associated_class)
        self.name = name
        self.associated_class = associated_class

class Model(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset, file_path):
        super().__init__(lineno, col_offset, end_col_offset, file_path)
        self.name = name

class View(PatternArtifact):
    def __init__(self, name, lineno, col_offset, end_col_offset, file_path):
        super().__init__(lineno, col_offset, end_col_offset, file_path)
        self.name = name
        self.model = None

class Template(PatternArtifact):
    def __init__(self, name, lineno=-1, col_offset=-1, end_col_offset=-1, file_path=""):
        super().__init__(lineno, col_offset, end_col_offset, file_path)
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

def line_of_needle(needle, file):
    r = open(file, 'r')
    line_counter = 1
    for line in r:
        if needle in line and "import" not in line: # exclude import statements
            return line_counter
        line_counter += 1
    return None

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

            # IS THE HEURISTIC TRUE 99% of the TIME
            # === MIXIN IDENTIFICATION ===
            # it seems that Mixin classes are almost always named [Name]Mixin in Python / Django
            # so we decide to make this fuzzy match
            if ("mixin" in node.name.lower()):
                # print("\nclass name:", node.name, node.lineno, node.col_offset, node.end_col_offset, t)
                MIXINS[node.name] = Mixin(node.name, node.lineno, -1, -1, t) # node lasts whole class so only care about the start line
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "FunctionDef":
                        #print("method / property name:", subnode.name, subnode.lineno, subnode.col_offset, subnode.end_col_offset)
                        pm = PropMethod(subnode.name, subnode.lineno, -1, -1, t, node.name) 
                        # node lasts whole method so only care about the start line
                        MIXINS[node.name].prop_methods.append(pm) 
          
            # === MODEL IDENTIFICATION ===
            is_model = False
            for b in node.bases:
                base_name = get_base_name(b)
                if base_name and type(base_name)==str:
                    if "model" in base_name.lower():
                        is_model = True
            if is_model:
                #print(node.name, "is a model", node.lineno, node.col_offset, node.end_col_offset)
                MODELS[node.name] = Model(node.name, node.lineno, -1, -1, t)  
                # node lasts whole class so only care about the start line
     
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
                    VIEWS[relevant_view_name] = View(relevant_view_name, node.lineno, -1, -1, t)
                else:
                    for b in node.bases:
                        base_name = get_base_name(b)
                        if base_name and type(base_name)==str:
                            if "view" in base_name.lower():
                                VIEWS[node.name] = View(node.name, node.lineno, -1, -1, t)
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
                            print("template constant:", node_arg.value, t)
                            TEMPLATES[node_arg.value] = [Template(node_arg.value, lineno=node_arg.lineno, file_path=t)]
            except:
                pass
            try:
                for kw in node.keywords:
                     if "template_name" in kw.arg:
                         print("template_name: ", kw.value.value, t)
                         TEMPLATES[kw.value.value] = [Template(kw.value.value, lineno=kw.lineno, file_path=t)]
                         
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
                            #print("view name:", view_part.func.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset)
                            VIEWS[view_part.func.id] = View(view_part.func.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset, t)
                        except:
                            try:
                                #print("view name:", view_part.func.value.id)
                                VIEWS[view_part.func.value.id] = View(view_part.func.value.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset, t)
                            except:
                                try:
                                    #print("view name:", view_part.id)
                                    VIEWS[view_part.id] = View(view_part.id, view_part.lineno, view_part.col_offset, view_part.end_col_offset, t)
                                except:
                                    try:
                                        #print("view name:", view_part.attr)
                                        VIEWS[view_part.attr] = View(view_part.attr, view_part.lineno, view_part.col_offset, view_part.end_col_offset, t)
                                    except:
                                        try:
                                            #print("view name:", view_part.func.value.attr)
                                            VIEWS[view_part.func.value.attr] = View(view_part.func.value.attr, view_part.lineno, view_part.col_offset, view_part.end_col_offset, t)
                                        except:
                                            try:
                                                #print("view name:", view_part.func.attr)
                                                VIEWS[view_part.func.attr] = View(view_part.func.attr, view_part.lineno, view_part.col_offset, view_part.end_col_offset, t)
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
                    #print("view name is using a mixin:", node.name, base_name, node.lineno, node.col_offset, node.end_col_offset)
                    using_mixin = base_name
                    adopting_view = View(node.name, node.lineno, -1, -1, t) 
                    # node lasts whole view class so only care about the start line
                    MIXINS[using_mixin].adopters.append(adopting_view) 
            
            # === find the adopted Mixin methods ===
            if using_mixin:
                for subnode in ast.walk(node):
                    if type(subnode).__name__ == "Call":
                        try:
                            if subnode.func.attr in [prop_method.name for prop_method in MIXINS[using_mixin].prop_methods]:
                                adopting_method = PropMethod(subnode.func.attr, subnode.lineno, subnode.col_offset, subnode.end_col_offset, t, node.name)
                                MIXINS[using_mixin].adopters.append(adopting_method)
                        except:
                            pass
                    if type(subnode).__name__ == "Attribute":
                        try:
                            if subnode.attr in [prop_method.name for prop_method in MIXINS[using_mixin].prop_methods]:
                                adopting_property = PropMethod(subnode.attr, subnode.lineno, subnode.col_offset, subnode.end_col_offset, t, node.name)
                                MIXINS[using_mixin].adopters.append(adopting_property)
                        except:
                            pass

            # === find the model use in views ===
            for model_name in MODELS:
                for view_name in VIEWS:
                    if model_name in view_name:
                        VIEWS[view_name].model = model_name
                    

# string search of other file types
for subdir, dirs, files in os.walk(folder_to_parse):
    for file in files:
        if file.lower().endswith(('.html')) or file.lower().endswith(('.tsx')):
            # === SEARCH FOR TEMPLATES ===
            for temp in TEMPLATES:
                if temp.lower().strip() == file.lower().strip(): 
                    print("this file is a template: ", file)
                    template_to_add = Template(file, file_path=os.path.join(subdir, file))
                    if file in TEMPLATES:
                        TEMPLATES[file].append(template_to_add)                        
                    else:    
                        TEMPLATES[file] = [template_to_add]
            try:
                file_in_folder = os.path.join(subdir, file)
                
                # === SEARCH FOR VIEWS === 
                for temp in VIEWS:
                    needle = "/" + VIEWS[temp].name
                    lineno = line_of_needle(needle, file_in_folder)
                    if lineno:
                        template_to_add = Template(needle, lineno, file_path=file_in_folder)
                        if needle in TEMPLATES:
                            TEMPLATES[needle].append(template_to_add)
                        else:
                            TEMPLATES[needle] = [template_to_add]
            except:
                pass

'''
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
'''

# print all the places we should highlight

jDP = {"mixins": {}, "models": [], "views": [], "templates": []}
CLASSES_BY_MIXINS = {}
for m in MIXINS:
    mixin = MIXINS[m]
    print(mixin.name, "mixin Need2highlight", mixin.lineno, mixin.col_offset, mixin.end_col_offset, mixin.file_path)
    jDP["mixins"][mixin.name] = {"prop_methods": [], "adopters": []}
    for pm in mixin.prop_methods:
        print(pm.name, "prop_method Need2highlight", pm.lineno, pm.col_offset, pm.end_col_offset, pm.file_path)
        jDP["mixins"][mixin.name]["prop_methods"].append(pm.name)
    for a in mixin.adopters:
        if type(a).__name__ == "View":
            print(a.name, "adopters_view Need2highlight", a.lineno, a.col_offset, a.end_col_offset, a.file_path)
            if not CLASSES_BY_MIXINS[a.name]:
                CLASSES_BY_MIXINS[a.name] = {}
            if not (mixin.name in CLASSES_BY_MIXINS[a.name]):
                CLASSES_BY_MIXINS[a.name][mixin.name] = [] 
                # [adopting class][mixin adopted] = [list of prop_methods adopted]
        else:
            print(a.name, "adopters_pm Need2highlight", a.lineno, a.col_offset, a.end_col_offset, a.file_path)
            if not 
                CLASSES_BY_MIXINS[]
            # need to figure out which class it is part of, store it above
        jDP["mixins"][mixin.name]["adopters"].append(a.name)

jDP["models"] = []
for m in MODELS:
    model = MODELS[m]
    print(model.name, "model Need2highlight", model.lineno, model.col_offset, model.end_col_offset, model.file_path)
    jDP["models"].append(model.name)

for v in VIEWS:
    view = VIEWS[v]
    print(view.name, "view Need2highlight", view.lineno, view.col_offset, view.end_col_offset, view.file_path)
    jDP["views"].append(view.name)

for t in TEMPLATES:
    templates_l = TEMPLATES[t]
    try: # in the case it's a list
        for template in templates_l:
            print(template.name, "template Need2highlight", template.lineno, template.col_offset, template.end_col_offset, template.file_path)
    except: # in the case it's just a single template
        template = templates_l
        print(template.name, "template Need2highlight", template.lineno, template.col_offset, template.end_col_offset, template.file_path)
    jDP["templates"].append(template.name)

response = {"name": folder_to_parse, "details": jDP}
print("response", response)

with open('out/dp.csv','a') as fd:
    writer_object = csv.writer(fd)
    writer_object.writerow([folder_to_parse,json.dumps(jDP)])
    fd.close()