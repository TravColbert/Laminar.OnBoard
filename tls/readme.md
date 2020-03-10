# TLS Directory #

This is the location of your TLS certificates that enable SSL.

The config.json file in the root of your project makes a couple references to this folder and the files in it:

<dl>
	<dt>keyFile</dt>
	<dd>The location to the PEM key file. You can technically use any directory you want but the tls directory is there for convenience.</dd>
	<dt>certFile</dt>
	<dd>The location to the CRT certificate file. You can technically use any directory you want but the tls directory is there for your convenience.</dd>
</dl>

You can generate your own keys for testing or you can acquire the keys.

## Getting the keys through Let's Encrypt and Certbot

One option is to use Certbot to get SSL keys through Let's Encrypt.

If you have control over your DNS records you may find that the easiest way to get your SSL certs is by using the DNS challenge method.  

Another method to get your cert is through the **webroot** method

### Command

After having installed certbot you can run the command:

```
sudo certbot -d yourdnsname.com --manual --preferred-challenges dns certonly
```

This will start a script that will attempt to authorize you by ensuring that you have control over the DNS records for the domain name you intend to create SSL certs for.

When you start the script it will ask you to create a TXT record in your DNS server with some specific text. Once this is done, continue with the script.

If the script was able to query the TXT record you created then it will download your new certs and keys into the /etc/letsencrypt directory.

### **webroot** Method Command

The webroot method is easy if your web server is configured properly. Here is the certbot command:

```
sudo certbot certonly --webroot -w /var/www/html -d yourdnsname.com -d www.yourdnsname.com
```

The above command will generate a certificate for both the base DNS domain name and the subdomain *www*. We've found this to be important if you want SEO and browsers to work right.

If the script was able to query the TXT record you created then it will download your new certs and keys into the /etc/letsencrypt directory.

### Copy the fullchain.pem and privkey.pem

Put the fullchain.pem and privkey.pem into the **tls/** folder of your Laminar installation.

### Renewing your keys

Remember to renew your keys by running ```certbot renew```

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
