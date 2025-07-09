# Management

## Authentication

Endpoints that are used to manage the service require authentication via an API
key. This key is set in the `.env` file as `AUTH_API_KEY`.

It has to be passed in the request header as `x-api-key`.

```http
curl -X 'POST' \
  'http://localhost:3000/vci/offer' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "response_type": "qrcode",
  "credentialConfigurationIds": [
    "pid"
  ]
}'
```

Other approaches like using OAuth2 or JWT are not supported at this time, but
feel free to contribute them.
