/* 
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

//----------------------------------------------------------------------------
//  Copyright (C) 2008-2011  The IPython Development Team
//
//  Distributed under the terms of the BSD License.  The full license is in
//  the file COPYING, distributed as part of this software.
//----------------------------------------------------------------------------

//============================================================================
// Global header/site setup.
//============================================================================

var IPython = (function (IPython) {
    "use strict";

    var Page = function () {
        this.style();
        this.bind_events();
    };

    Page.prototype.style = function () {
        $('div#header').addClass('border-box-sizing');
        $('div#site').addClass('border-box-sizing');
    };


    Page.prototype.bind_events = function () {
    };


    Page.prototype.show = function () {
        // The header and site divs start out hidden to prevent FLOUC.
        // Main scripts should call this method after styling everything.
        this.show_header();
        this.show_site();
    };


    Page.prototype.show_header = function () {
        // The header and site divs start out hidden to prevent FLOUC.
        // Main scripts should call this method after styling everything.
        $('div#header').css('display','block');
    };


    Page.prototype.show_site = function () {
        // The header and site divs start out hidden to prevent FLOUC.
        // Main scripts should call this method after styling everything.
        $('div#site').css('display','block');
    };


    IPython.Page = Page;

    return IPython;

}(IPython));
