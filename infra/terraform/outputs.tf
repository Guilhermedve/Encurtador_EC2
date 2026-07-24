output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.backend.id
}

output "elastic_ip" {
  description = "Elastic IP to configure in Cloudflare."
  value       = aws_eip.backend.public_ip
}

output "api_url" {
  description = "Public API URL after DNS propagation."
  value       = "https://${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command using the private key matching the configured public key."
  value       = "ssh -i \"${trimsuffix(pathexpand(var.ssh_public_key_path), ".pub")}\" ubuntu@${aws_eip.backend.public_ip}"
}

output "cloudflare_record" {
  description = "Manual Cloudflare DNS-only record."
  value = {
    type    = "A"
    name    = var.domain_name
    content = aws_eip.backend.public_ip
    proxied = false
  }
}

output "bootstrap_log_command" {
  description = "Command to inspect the bootstrap log after SSH."
  value       = "sudo tail -n 200 /var/log/encurtador-bootstrap.log"
}
