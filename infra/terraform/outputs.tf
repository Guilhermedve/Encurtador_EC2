output "vm_id" {
  description = "Azure VM resource ID."
  value       = azurerm_linux_virtual_machine.backend.id
}

output "public_ip" {
  description = "Public IP to configure in Cloudflare."
  value       = azurerm_public_ip.backend.ip_address
}

output "api_url" {
  description = "Public API URL after DNS propagation."
  value       = "https://${var.domain_name}"
}

output "ssh_command" {
  description = "SSH command using the private key matching the configured public key."
  value       = "ssh -i \"${trimsuffix(pathexpand(var.ssh_public_key_path), ".pub")}\" ubuntu@${azurerm_public_ip.backend.ip_address}"
}

output "cloudflare_record" {
  description = "Manual Cloudflare DNS-only record."
  value = {
    type    = "A"
    name    = var.domain_name
    content = azurerm_public_ip.backend.ip_address
    proxied = false
  }
}

output "bootstrap_log_command" {
  description = "Command to inspect the bootstrap log after SSH."
  value       = "sudo tail -n 200 /var/log/encurtador-bootstrap.log"
}
