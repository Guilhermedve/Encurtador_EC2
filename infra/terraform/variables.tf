variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project identifier used in names and tags."
  type        = string
  default     = "encurtador"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,31}$", var.project_name))
    error_message = "project_name must use 3-32 lowercase letters, digits, or hyphens."
  }
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "domain_name" {
  description = "DNS-only Cloudflare hostname used by Caddy and PUBLIC_BASE_URL."
  type        = string

  validation {
    condition = (
      length(trimspace(var.domain_name)) > 0 &&
      !strcontains(var.domain_name, "://") &&
      !startswith(var.domain_name, ".") &&
      !endswith(var.domain_name, ".")
    )
    error_message = "domain_name must be a hostname without scheme or trailing dot."
  }
}

variable "ssh_public_key_path" {
  description = "Local path to the SSH public key file."
  type        = string

  validation {
    condition     = fileexists(pathexpand(var.ssh_public_key_path))
    error_message = "ssh_public_key_path must point to an existing public key file."
  }
}

variable "ssh_allowed_cidr" {
  description = "Single IPv4 CIDR allowed to connect by SSH."
  type        = string

  validation {
    condition = (
      can(cidrnetmask(var.ssh_allowed_cidr)) &&
      var.ssh_allowed_cidr != "0.0.0.0/0"
    )
    error_message = "ssh_allowed_cidr must be a valid restricted IPv4 CIDR and cannot be 0.0.0.0/0."
  }
}

variable "backend_image" {
  description = "Public GHCR image consumed by the EC2 Compose stack."
  type        = string
  default     = "ghcr.io/guilhermedve/encurtador_ec2-backend:latest"
}

variable "rate_limit_max" {
  description = "Maximum POST attempts per fixed window."
  type        = number
  default     = 10

  validation {
    condition     = var.rate_limit_max > 0 && floor(var.rate_limit_max) == var.rate_limit_max
    error_message = "rate_limit_max must be a positive integer."
  }
}

variable "rate_limit_window_seconds" {
  description = "Rate limiting fixed window in seconds."
  type        = number
  default     = 60

  validation {
    condition = (
      var.rate_limit_window_seconds > 0 &&
      floor(var.rate_limit_window_seconds) == var.rate_limit_window_seconds
    )
    error_message = "rate_limit_window_seconds must be a positive integer."
  }
}

variable "watchtower_poll_seconds" {
  description = "Watchtower registry polling interval."
  type        = number
  default     = 300

  validation {
    condition = (
      var.watchtower_poll_seconds >= 60 &&
      floor(var.watchtower_poll_seconds) == var.watchtower_poll_seconds
    )
    error_message = "watchtower_poll_seconds must be an integer of at least 60."
  }
}

variable "extra_tags" {
  description = "Additional AWS resource tags."
  type        = map(string)
  default     = {}
}
