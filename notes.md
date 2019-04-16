# domainlinks.json

This file is a JSON file listing all models that can be enumerated when you select a domain. By default the 'notes' model is listed. Therefore, whenever you select a domain, Laminar will automatically list all 'notes' attached to that domain.

If you want to add an object that would be automatically listed you must do two things:

 1. Add your model to the domainlinks.json file
 1. Make sure your [model] controller has a 'getByDomainId()' method defined

# copyright notice

Here is a copyright notice that might be good to include in sidebar:

> © [Full Name] and [Blog Name], [Current Year or Year Range]. Unauthorized use and/or duplication of this material without express and written permission from this blog’s author and/or owner is strictly prohibited. Excerpts and links may be used, provided that full and clear credit is given to [Your Name] and [Your Blog Name] with appropriate and specific direction to the original content.

# Node on 443 on Ubuntu

Try this to get laminar working on Ubuntu without running it as root:

```
sudo setcap 'cap_net_bind_service=+ep' $(readlink -f $(which node))
```

