# Setting Up Laminar.OnBoard

This is a quick-guide for how to use Lamainar.OnBoard to spin-up a secure 
https, user-aware, sqlite-backed web service in a jiffy.

## Install Modules Through NPM init

```bash
cd your_project
npm init
```
## Create TLS Keys

Put the keys in tls/

## Create and move into your new project directory

```bash
mkdir your_project
cd your_project
```

## Clone Laminar.Onboard into your project directory

Clone Laminar.OnBoard [here](https://github.com/TravColbert/Laminar.OnBoard.git).

```sh
git clone https://github.com/TravColbert/Laminar.OnBoard.git
```

## Configure Your Project

Now, configure Lamainar.OnBoard for your project. Start with the **config.json** 
file at the root of your new project.

Here are the items you want to configure:

### config.json

#### appName

Name of the web app. This will appear on the main navigation entities.

##### Example:

"My App"

#### homeView

Name of the Pug templating engine view that will serve the main homepage for 
authenticated and unauthenticated users.

This view gets called any time a user hits the root of your web app.

Note that the standard .*pug* extension is added autmatically.

##### Example: 

"home"

#### homeModule

When a user hits your root ('/') you can optionally specify a module with a 
method called *home()* that will get called just before the **homeView** 
template gets called. The goal of this *home()* method should be to populate
the user's environment with whatever objects might be required by your 
**homeView** view.

##### Example:

"my_custom_home"

This would look for my_custom_home.js file in the modules directory off the 
root of your project.

Note that the **.js** extension gets added automatically to the end of your name here.

### Define Models

Set up your database tables with model-definition file in the /models folder.

### Set Up Menus

Set up navigation with the menu.json file.

