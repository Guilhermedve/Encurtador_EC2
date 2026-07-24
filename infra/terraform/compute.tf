data "aws_ssm_parameter" "ubuntu_ami" {
  name = "/aws/service/canonical/ubuntu/server/noble/stable/current/amd64/hvm/ebs-gp3/ami-id"
}

locals {
  deployment_env = <<-EOT
    DOMAIN_NAME=${var.domain_name}
    BACKEND_IMAGE=${var.backend_image}
    RATE_LIMIT_MAX=${var.rate_limit_max}
    RATE_LIMIT_WINDOW_SECONDS=${var.rate_limit_window_seconds}
    WATCHTOWER_POLL_SECONDS=${var.watchtower_poll_seconds}
  EOT

  cloud_init = templatefile("${path.module}/templates/cloud-init.sh.tftpl", {
    compose_base64   = base64encode(file("${path.module}/../../deploy/ec2/docker-compose.yml"))
    caddyfile_base64 = base64encode(file("${path.module}/../../deploy/ec2/Caddyfile"))
    env_base64       = base64encode(local.deployment_env)
  })
}

resource "aws_key_pair" "deployer" {
  key_name   = "${var.project_name}-${var.environment}"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

resource "aws_instance" "backend" {
  ami                         = nonsensitive(data.aws_ssm_parameter.ubuntu_ami.value)
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.backend.id]
  key_name                    = aws_key_pair.deployer.key_name
  associate_public_ip_address = false

  user_data                   = local.cloud_init
  user_data_replace_on_change = true

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  credit_specification {
    cpu_credits = "standard"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-backend"
  }

  depends_on = [aws_route_table_association.public]
}

resource "aws_eip" "backend" {
  domain   = "vpc"
  instance = aws_instance.backend.id

  tags = {
    Name = "${var.project_name}-${var.environment}-backend"
  }
}
