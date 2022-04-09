import ast
import sys

print("in python")
print(sys.argv[1])
file_to_parse = sys.argv[1]
print("file_to_parse: ", file_to_parse)
r = open(file_to_parse, 'r')
try:
    t = ast.parse(r.read())
    print("ast:")
    print(t)
    for node in ast.walk(t):
        # print(f'Nodetype: {type(node).__name__:{16}} {node}')
        if type(node).__name__ == "ClassDef":
            print("found a class:", ast.dump(node))
except Exception:
    print("There was an exception when trying to AST parse: ", file_to_parse)