# Copyright 2023 FactorLibre - Juan Carlos Bonilla
from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    payment_method_id = fields.Many2one(
        related="pos_config_id.payment_method_id",
        readonly=False,
    )