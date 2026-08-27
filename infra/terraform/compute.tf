locals {
  deployment_env = <<-EOT
    DOMAIN_NAME=${var.domain_name}
    BACKEND_IMAGE=${var.backend_image}
    RATE_LIMIT_MAX=${var.rate_limit_max}
    RATE_LIMIT_WINDOW_SECONDS=${var.rate_limit_window_seconds}
    WATCHTOWER_POLL_SECONDS=${var.watchtower_poll_seconds}
  EOT

  cloud_init = templatefile("${path.module}/templates/cloud-init.sh.tftpl", {
    compose_base64   = base64encode(file("${path.module}/../../deploy/azure-vm/docker-compose.yml"))
    caddyfile_base64 = base64encode(file("${path.module}/../../deploy/azure-vm/Caddyfile"))
    env_base64       = base64encode(local.deployment_env)
  })
}

resource "azurerm_public_ip" "backend" {
  name                = "${var.project_name}-${var.environment}-backend"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-backend" })
}

resource "azurerm_network_interface" "backend" {
  name                = "${var.project_name}-${var.environment}-backend"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.public.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.backend.id
  }

  tags = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-backend" })
}

resource "azurerm_linux_virtual_machine" "backend" {
  name                = "${var.project_name}-${var.environment}-backend"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = var.vm_size
  admin_username      = "ubuntu"

  network_interface_ids = [
    azurerm_network_interface.backend.id,
  ]

  admin_ssh_key {
    username   = "ubuntu"
    public_key = file(pathexpand(var.ssh_public_key_path))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  custom_data = base64encode(local.cloud_init)

  tags = merge(local.common_tags, { Name = "${var.project_name}-${var.environment}-backend" })
}
