# Setting Up Navigation

Navigation is configured by a **menu.json** file in the navigation folder.
The navigation folder is defined in the **config.json** file controling your 
web app in the *navDir* property.

By default the *navDir* is <root>*navigation*.

## Navigation Bars

The **menu.json** file defines an dictionary of navigation bars. The key of the
property is the name of the navigation bar. You can define any number of 
navigation bars. They must have their own "name" defined as the key.

Each navigation bar is an array or list of navigation entries.

By default we have a navigation bar entry called *main*.

## Navigation Entries

Each navigation bar has one or more entries that represent menu items that may
appear on-screen under certain circumstances. Each entry is an object that 
looks like this:

```javascript
{
  "main":[
    {"link":"/blog/","text":"Blog","icon":"content_copy"},
    {"link":"/test/","text":"Test","icon":"content_paste"},
    {"link":"/users/","text":"Users","icon":"people_outline","secured":true},
    {"link":"/login/","text":"Log In","icon":"verified_user","secured":false},
    {"link":"/logout/","text":"Log Out","icon":"highlight_off","secured":true}
  ]
}
```

The above is a complete **menu.json** file. In the **main** navigation bar 
there are *potentially* 5 links or navigation items: 

1. **Blog**
1. **Test**
1. **Users**
1. **Log In**
1. **Log Out**

### link

Specifies the link that will be triggered when the navigation item is activated.

### text

What appears on-screen in the navigation item

### icon

The icon that will appear for the navigation item. These icons are currently 
based on the Google Material Icons set.

### secured

If the icon appears.

There are three states for the security of a navigation item:

* **secured property not present** : The navigation item will alwaya appear on the navigation bar
* **secured:true** : The navigation item will only appear when the user has been authenticated
* **secured:false** : The navigation item only appears when the user is **not** authenticated
