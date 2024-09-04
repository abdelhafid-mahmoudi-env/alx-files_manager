# Files Manager

## Overview

This project is a summary of the back-end trimester, focusing on building a simple file management platform that includes authentication, file upload, file viewing, and other related operations. The project leverages various technologies such as Node.js, Express, MongoDB, Redis, and more.

## Features

- User Authentication via Token
- List All Files
- Upload New Files
- Change File Permissions
- View Files
- Generate Thumbnails for Images

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for Node.js.
- **MongoDB**: NoSQL database for storing user and file data.
- **Redis**: In-memory data structure store, used as a cache and message broker.
- **Bull**: A Node.js library for handling jobs and messages in Redis.
- **Mocha**: JavaScript test framework.
- **Nodemon**: Tool that helps develop Node.js applications by automatically restarting the server when code changes.

## Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/abdelhafid-mahmoudi-env/alx-files_manager.git
   ```

2. Navigate to the project directory:
    ```sh
    cd alx-files_manager
    ```

3. Install the dependencies:
    ```sh
    npm install
    ```

## Usage

### Running the Server

To start the server, run:
```sh
npm run start-server
```

## Running the Worker

To start the worker, run:
```sh
npm run start-worker
```

## Authors

* **Abdelhafid Mahmoudi** - [abdelhafid-mahmoudi-env](https://github.com/abdelhafid-mahmoudi-env)
* **EL ORCHE Amine** - [Eltrone](https://github.com/Eltrone)
