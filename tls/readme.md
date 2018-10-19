# TLS Directory #

This is the location of your TLS certificates that enable SSL.

The config.json file in the root of your project makes a couple references to this folder and the files in it:

<dl>
	<dt>keyFile</dt>
	<dd>The location to the PEM key file. You can technically use any directory you want but the tls directory is there for convenience.</dd>
	<dt>certFile</dt>
	<dd>The location to the CRT certificate file. You can technically use any directory you want but the tls directory is there for your convenience.</dd>
</dl>

## Creating Your SSL keys:

To create these files:

### Generate Private Key

```bash
openssl genrsa -des3 -out server.key 1024
```

You'll have to enter and confirm a passphrase eventually here.

#### Windows GitBash

This appeared to work better in Windows' GitBash:

```bash
openssl genrsa -des3 -out server.key -passout pass:[your_password] 1024
```

This command works:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```
### Generate a Certificate Signing Request

```bash
openssl req -new -key server.key -out server.csr
```

You'll have to provide some information that comprise the X-509 attributes of your cert.

### Remove Passphrase from Key

```bash
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key
```

### Generate a Self-Signed Certificate

```bash
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```

### Final Setup

Copy the server.crt and the server.key files to your tls directory.

## Edit Your config.json File

Now, edit your config.json file to refer to your new SSL keys.

Your config.json file will look something like this:

```
  "keyFile":"tls/server.key",
  "certFile":"tls/server.crt",
```
