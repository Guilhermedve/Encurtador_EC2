# Terraform EC2

Esta configuração usa state local. Nunca versione `terraform.tfstate`,
`terraform.tfvars`, arquivos de plan ou credenciais AWS.

## Pré-requisitos

- credenciais AWS configuradas;
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
terraform plan -out=ec2.tfplan
```

O apply é uma ação com custo e deve ocorrer somente após revisão do plan.
Faça backup seguro do state antes e depois de cada alteração.
