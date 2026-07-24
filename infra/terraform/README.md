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

## Recursos criados

- VPC e subnet pública;
- Internet Gateway e rota;
- Security Group com 22 restrito e 80/443 públicos;
- Key Pair a partir da chave pública local;
- EC2 Ubuntu 24.04 AMD64;
- root EBS gp3 criptografado no tamanho padrão da AMI;
- Elastic IP.

## Depois do apply

Use o output `cloudflare_record` para criar o registro `A` em DNS only.
Depois da propagação, verifique:

```sh
curl --fail https://SEU_DOMINIO/health
```

O `terraform apply` cria recursos cobrados. Revise sempre o plan salvo antes.
