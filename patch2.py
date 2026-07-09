with open('js/script.js', 'r') as f:
    code = f.read()

code = code.replace("fetch('data/config.json')", "fetch('./data/config.json')")
code = code.replace("fetch('data/movies.json')", "fetch('./data/movies.json')")
code = code.replace("fetch('data/ratings.json')", "fetch('./data/ratings.json')")
code = code.replace("fetch('data/comments.json')", "fetch('./data/comments.json')")

with open('js/script.js', 'w') as f:
    f.write(code)
print("Updated to explicit relative paths.")
