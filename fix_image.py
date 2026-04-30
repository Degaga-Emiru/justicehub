with open("frontend/app/page.js", "r", encoding="utf-8") as f:
    content = f.read()

old = 'className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000"'
new = 'className="w-full object-cover transform group-hover:scale-110 transition-transform duration-1000"\n  style={{ height: "700px", minHeight: "500px", objectPosition: "center" }}'

if old in content:
    content = content.replace(old, new)
    with open("frontend/app/page.js", "w", encoding="utf-8") as f:
        f.write(content)
    print("Done - replaced successfully")
else:
    print("Pattern not found")
