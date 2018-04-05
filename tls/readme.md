# TLS Directory #

This is the location of your TLS certificates that enable SSL.

The config.json file in the root of your project makes a couple references to this folder and the files in it:

<dl>
	<dt>keyFile</dt>
	<dd>The location to the PEM key file. You can technically use any directory you want but the tls directory is there for convenience.</dd>
	<dt>certFile</dt>
	<dd>The location to the CRT certificate file. You can technically use any directory you want but the tls directory is there for your convenience.</dd>
</dl>

To create these files:
