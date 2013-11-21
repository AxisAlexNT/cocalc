#!/usr/bin/env python
"""
lxc.py -- create and run an ephemeral LXC containers with the given memory, cpus, and other
          limitations.   When this script terminates, the LXC container vanishes.

EXAMPLE:

   sudo ./lxc.py -d --ip_address=10.10.10.4 --hostname=test2 --pidfile=b.pid --logfile=b.log --base=base

"""

#######################################################################
# Copyright (c) William Stein, 2013.  Not open source or free.
#######################################################################

import logging, os, shutil, signal, socket, sys, tempfile, time
from admin import run, sh
conf_path = os.path.join(os.path.split(os.path.realpath(__file__))[0], 'conf')



def run_lxc(ip_address, hostname, base='base'):
    if len(hostname.split()) != 1 or not hostname.strip():
        raise ValueError("hostname must not have whitespace")

    # If the container already exists, exit with an error
    if run(['lxc-ls', hostname]).strip():
        raise RuntimeError("there is already a container %s"%hostname)

    try:
        ephemeral_tinc_key = False

        # Create the ephemeral container
        run(["lxc-clone", "-s", "-B", "overlayfs", "-o", base, "-n", hostname])

        path = os.path.join("/var/lib/lxc/", hostname)
        root = os.path.join(path, "delta0")
        tinc_path = os.path.join(root, 'etc/tinc/smc')
        if not os.path.exists(path):
            raise RuntimeError("error creating lxc container -- missing files")
        # Configure the tinc network:
        #   - create all the relevant files in delta0/etc/tinc
        tincname = hostname.replace('-','_')
        vmhost_tincname = socket.gethostname().replace('-','_')

        os.makedirs(os.path.join(tinc_path,'hosts'))
        shutil.copyfile(os.path.join("/etc/tinc/hosts/",vmhost_tincname), os.path.join(tinc_path,'hosts',vmhost_tincname))

        open(os.path.join(tinc_path, 'tinc-up'),'w').write(
            "#!/bin/sh\nifconfig $INTERFACE %s netmask 255.192.0.0"%ip_address)
        open(os.path.join(tinc_path, 'tinc.conf'),'w').write(
            "Name = %s\nConnectTo = %s"%(tincname, vmhost_tincname))

        rsa_key_priv = os.path.join(tinc_path, 'rsa_key.priv')
        rsa_key_pub = os.path.join(tinc_path, 'hosts', tincname)
        run(["tincd", "-K", "-c", tinc_path])

        host_file = os.path.join(tinc_path, 'hosts', tincname)
        public_key = open(rsa_key_pub).read().strip()
        open(host_file,'w').write("Subnet = %s/32\n%s"%(ip_address, public_key))
        # put the tinc public key in host config, so that the vm can connect to host.
        ephemeral_tinc_key = os.path.join("/etc/tinc/hosts/", tincname)
        shutil.copyfile(host_file, os.path.join("/etc/tinc/hosts/", tincname))

        os.makedirs(os.path.join(root, 'dev/net'))
        run(["mknod", os.path.join(root, 'dev/net/tun'), "c", "10", "200"])
        run(['chmod', 'a+x', os.path.join(tinc_path, 'tinc-up')])

        f = open(os.path.join(root, 'etc/tinc/nets.boot'),'w')
        f.write('smc')
        f.close()

        # Start the container
        s = ["lxc-start", "-d", "-n", hostname]
        run(s, maxtime=10)

        def clean(*args):
            try:
                run(['lxc-destroy', '-f', '-n', hostname])
            finally:
                if ephemeral_tinc_key and os.path.exists(ephemeral_tinc_key):
                    os.unlink(ephemeral_tinc_key)
            sys.exit(0)

        signal.signal(signal.SIGTERM, clean)

        # Wait for the container to stop
        run(['lxc-wait', '-n', hostname, '-s', 'STOPPED'], maxtime=0)
        log.info("container has stopped")
    finally:
        log.info("stop and remove the container.")
        clean()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="lxc.py starts LXC container with given configuration")

    parser.add_argument("-d", dest="daemon", default=False, action="store_const", const=True,
                        help="daemon mode (default: False)")
    parser.add_argument("--ip_address", dest="ip_address", type=str, required=True,
                        help="ip address of the virtual machine on the VPN")
    parser.add_argument("--hostname", dest="hostname", type=str, required=True,
                        help="hostname of the virtual machine on the VPN")
    parser.add_argument("--vcpus", dest="vcpus", type=str, default="2",
                        help="number of virtual cpus")
    parser.add_argument("--ram", dest="ram", type=int, default=4,
                        help="Gigabytes of ram")
    parser.add_argument("--pidfile", dest="pidfile", type=str, default='',
                        help="store pid in this file")
    parser.add_argument("-l", dest='log_level', type=str, default='INFO',
                        help="log level (default: INFO) useful options include WARNING and DEBUG")
    parser.add_argument("--logfile", dest="logfile", type=str, default='',
                        help="store log in this file (default: '' = don't log to a file)")
    parser.add_argument("--bind", dest="bind", type=str, default="",
                        help="bind directories")
    parser.add_argument('--base', dest='base', type=str, default='base',
                        help="template container on which to base this container.")

    args = parser.parse_args()

    if args.logfile:
        args.logfile = os.path.abspath(args.logfile)
    if args.pidfile:
        args.pidfile = os.path.abspath(args.pidfile)
    if args.ip_address.count('.') != 3 or not args.ip_address.startswith('10.'):
        sys.stderr.write("%s: invalid ip address %s"%(sys.argv[0], args.ip_address))
        sys.exit(1)

    args.hostname = args.hostname if args.hostname else args.ip_address.replace('.','dot')

    def main():
        global log

        logging.basicConfig()
        log = logging.getLogger('lxc')
        log.setLevel(logging.INFO)

        if args.log_level:
            level = getattr(logging, args.log_level.upper())
            log.setLevel(level)

        if args.logfile:
            log.addHandler(logging.FileHandler(args.logfile))

        import admin   # take over the admin logger
        admin.log = log

        log.info("logger started")

        if args.pidfile:
            open(args.pidfile,'w').write(str(os.getpid()))

        run_lxc(ip_address=args.ip_address, hostname=args.hostname, base=args.base)

    try:
        if args.daemon:
            if not args.pidfile:
                raise ValueError("in daemon mode, the pidfile must be specified")
            import daemon
            daemon.daemonize(args.pidfile)
            main()
        else:
            main()
    finally:
        if args.pidfile and os.path.exists(args.pidfile):
            os.unlink(args.pidfile)
