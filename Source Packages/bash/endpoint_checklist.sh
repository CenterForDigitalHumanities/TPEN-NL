# Log in to TPEN
curl -i -X POST --cookie-jar tpen.txt http://$SERVER/T-PEN/login?uname=ericsmith@slu.edu\&password=foo
curl -i -X POST -H "Content-Type: application/json" --cookie-jar tpen.txt -d '{"mail":"ericsmith@slu.edu","password":"foo"}' http://$SERVER/T-PEN/login

# Log out of TPEN
curl -i -X POST --cookie-jar tpen.txt http://$SERVER/T-PEN/login


# List user projects
curl -i -X GET --cookie tpen.txt http://$SERVER/T-PEN/projects

# Get user project
curl -i -X GET --cookie tpen.txt http://$SERVER/T-PEN/project/1 > project.jsonld

# Put user project
curl -i -X PUT --cookie tpen.txt -d @2436.jsonld -H "Content-Type: application/ld+json" http://$SERVER/T-PEN/project/1

# List user manuscripts
curl -i -X GET --cookie tpen.txt http://$SERVER/T-PEN/manuscripts

Endpoint: /manuscripts

## 3. Search ##
Endpoint: /search

## 4. Importing manuscript from vhmml and create project ##
Endpoint: /createManuscript
