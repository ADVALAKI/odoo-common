# -*- coding: utf-8 -*-
#################################################################################
#
#    Copyright (c) 2015-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>)
#
#################################################################################
{
    "name": "Point of Sale : Order reprint",
    "category": 'Point Of Sale',
    "summary": """
        Reprint orders in the running session of point of sale.""",
    "description": """ This module is use to reprint the orders in the running point of sale session."",

====================
**Help and Support**
====================
.. |icon_features| image:: pos_order_reprint/static/src/img/icon-features.png
.. |icon_support| image:: pos_order_reprint/static/src/img/icon-support.png
.. |icon_help| image:: pos_order_reprint/static/src/img/icon-help.png

modified by Taktik SA

|icon_help| `Help <https://webkul.com/ticket/open.php>`_ |icon_support| `Support <https://webkul.com/ticket/open.php>`_ |icon_features| `Request new Feature(s) <https://webkul.com/ticket/open.php>`_
    """,
    "sequence": 1,
    "author": "Webkul Software Pvt. Ltd.",
    "website": "http://www.webkul.com",
    "version": '1.0',
    "depends": ['point_of_sale',
                'tk_pos_validate_order_hook'],
    "data": [
        'views/pos_order_repaint.xml',
    ],
    "images":['static/description/order_list.png'],
    'qweb': [
        'static/src/xml/pos_order_repaint.xml',
    ],
    "installable": True,
    "application": True,
    "auto_install": False,
    "price": 20,
    "currency": 'EUR',
}
