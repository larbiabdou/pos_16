# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from collections import defaultdict
from datetime import timedelta

from odoo import api, fields, models, _
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tools import float_is_zero
import logging

_logger = logging.getLogger(__name__)


class AccountMove(models.Model):
    _inherit = 'account.move'

    pos_order_id = fields.Many2one(
        comodel_name='pos.order',
        string='Ordre',
        required=False)
    commande = fields.Char(
        string='Commande',
        required=False)

    is_pos_credit = fields.Boolean(string="Is pos credit")
    line_ids = fields.One2many(
        'account.move.line',
        'move_id',
        string='Journal Items',
        copy=True,
        readonly=False,
    )
