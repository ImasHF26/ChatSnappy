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


#### Ngrok

Get the NGROK_AUTHTOKEN from Ngrok and put in .env.

Then curl Ngrok tunnels

```shell
docker run --rm --network chatsnappy_local-net curlimages/curl:8.5.0 -s http://ngrok:4040/api/tunnels
```



