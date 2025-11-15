# Production Deployment

## Task: Deploy our application on production

## Details needed

Our application consists of 3 microservices in /home/statex/. Access via ssh statex.

Initial task: pull github repos using ssh statex "cd logging-microservice && git pull && cd ../nginx-microservice && git pull && docker exec nginx-microservice nginx -t && docker exec nginx-microservice nginx -s reload"
In case there will be local file changes they needs to be checked against github version and git repo should be corrected with working codebase.

nginx-microservice handles blue/green deployments.
Use the same nginx and database setup to manage logging-microservice:
Run: ssh statex "cd nginx-microservice && ./scripts/blue-green/deploy.sh logging-microservice"

database-server is the PostgreSQL database for the app.

Applications are located at /Users/sergiystashok/Documents/GitHub/ (prod: /home/statex).

Configs and logs are in project root folders and ./logs/.
Environment variables are protected and stored within root folder for each project. Use command cat .env to see it

This modular architecture improves development and separation of services.


Success is when http://logging-microservice:3268 accessible and there are no warnings or errors in the logs.
