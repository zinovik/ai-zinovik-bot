# ai-zinovik-bot

## bot setup

```bash
curl https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook?url=https://europe-central2-zinovik-project.cloudfunctions.net/ai-zinovik-bot?token=<APP_TOKEN>
```

## google cloud setup

### create service accounts

```bash
gcloud iam service-accounts create github-actions
gcloud iam service-accounts create ai-zinovik-bot
```

### add roles (`Service Account User` and `Cloud Functions Admin`) to the service account you want to use to deploy the function

```
gcloud projects add-iam-policy-binding zinovik-project --member="serviceAccount:github-actions@zinovik-project.iam.gserviceaccount.com" --role="roles/cloudfunctions.admin"

gcloud projects add-iam-policy-binding zinovik-project --member="serviceAccount:github-actions@zinovik-project.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
```

### creating keys for service account for github-actions `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY_FILE`

```bash
gcloud iam service-accounts keys create key-file.json --iam-account=github-actions@zinovik-project.iam.gserviceaccount.com
cat key-file.json | base64
```

### add access to secrets and bucket

```
gcloud projects add-iam-policy-binding zinovik-project --member="serviceAccount:ai-zinovik-bot@zinovik-project.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

### add secrets

```
printf "TELEGRAM_TOKEN" | gcloud secrets create ai-zinovik-bot-telegram-token --locations=europe-central2 --replication-policy="user-managed" --data-file=-

printf "CHATGPT_TOKEN" | gcloud secrets create ai-zinovik-bot-chatgpt-token --locations=europe-central2 --replication-policy="user-managed" --data-file=-

printf "APP_TOKEN" | gcloud secrets create ai-zinovik-bot-app-token --locations=europe-central2 --replication-policy="user-managed" --data-file=-
```
