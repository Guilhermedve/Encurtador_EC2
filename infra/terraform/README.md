# Terraform Azure VM

Esta configuração usa state local. Nunca versione `terraform.tfstate`,
`terraform.tfvars`, arquivos de plan ou credenciais Azure.

## Pré-requisitos

- credenciais Azure configuradas (`az login` ou service principal via
  `ARM_CLIENT_ID`/`ARM_CLIENT_SECRET`/`ARM_SUBSCRIPTION_ID`/`ARM_TENANT_ID`);
- chave pública SSH existente;
- domínio no Cloudflare;
- Terraform 1.6 ou superior.

Copie `terraform.tfvars.example` para `terraform.tfvars` e preencha os três
valores obrigatórios.

## Validação

```sh
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -out=azure.tfplan
```

O apply é uma ação com custo e deve ocorrer somente após revisão do plan.
Faça backup seguro do state antes e depois de cada alteração.

## Recursos criados

- Resource Group;
- Virtual Network e subnet pública;
- Network Security Group com 22 restrito e 80/443 públicos;
- Network Interface e IP público estático (SKU Standard);
- VM Linux Ubuntu 24.04 (Canonical);
- disco OS StandardSSD_LRS.

## Depois do apply

Use o output `cloudflare_record` para criar o registro `A` em DNS only.
Depois da propagação, verifique:

```sh
curl --fail https://SEU_DOMINIO/health
```

O `terraform apply` cria recursos cobrados. Revise sempre o plan salvo antes.
