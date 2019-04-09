# domainlinks.json

This file is a JSON file listing all models that can be enumerated when you select a domain. By default the 'notes' model is listed. Therefore, whenever you select a domain, Laminar will automatically list all 'notes' attached to that domain.

If you want to add an object that would be automatically listed you must do two things:

 1. Add your model to the domainlinks.json file
 1. Make sure your [model] controller has a 'getByDomainId()' method defined

