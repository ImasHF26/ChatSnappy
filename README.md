# Snappy - Chat Application 

Snappy is chat application build with the power of MERN Stack. You can find the tutorial [here](https://www.youtube.com/watch?v=otaQKODEUFs)


## Installation Guide

### Requirements
- [DOCKER]
- [DOCKER-COMPSOE]

Both should be installed.
### Installation

- This requires docker and docker-compose to be installed in your system.
- Make sure you are in the root of your project and run the following command.

```shell
docker compose build --no-cache
```
after the build is complete run the containers using the following command
```shell
docker compose up -d
```
now open localhost:3000 in your browser.

#### Ngrok

To get the public domain provided by Ngrok do the following :

```shell
docker exec -it chat_mongodb bash
```

Then curl Ngrok tunnels

```shell
curl http://ngrok:4040/api/tunnels
```

Get the link and replace host variable in this path "public\src\utils\APIRoutes.js"

Then do the following :

```shell
docker-compose down front
```

```shell
docker-compose up front --build -d
```