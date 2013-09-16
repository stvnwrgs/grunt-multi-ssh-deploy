/*
 * grunt-multi-ssh-deploy
 * https://github.com/stvnwrgs/grunt-multi-ssh-deploy
 *
 * Copyright (c) 2013 Steven Wirges
 * Licensed under the GPL, 2 licenses.
 */

'use strict';

module.exports = function(grunt) {

  // multi_ssh_deploy:{
  //   live: {
  //     options: {
  //       username: 'deployer',
  //       password: '',
  //       privateKeyPath: '~/.ssh/id_rsa',
  //       passphrase: '',
  //       srcPath: './build/',
  //       releasePath: '/var/www/project/releases',
  //       currentPath: '/var/www/project/current',
  //       deleteOldVersions: 2,
  //     }
  //     server: [
  //       '192.168.0.1',
  //       '192.168.0.2',
  //     ],
  //   }
  // }

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('multi_ssh_deploy', 'A Grunt Task for deploying webapplications to many server and many environments via scp with symlink zero downtime', function() {
    var self = this;
    var async = require('async');
    var ssh = require('ssh2');
    var done = self.async();

    var options = self.options();
    var server = self.data.server;

    var taskChain = '';

    var addTask = function (task) {
      if (taskChain != '') {
        taskChain += ' && '
      }
      taskChain += task;
    }
    
    function run_cmd(cmd, args, callBack ) {
      var spawn = require('child_process').spawn;
      var child = spawn(cmd, args);
      var resp = "";

      child.stdout.on('data', function (buffer) { resp += buffer.toString() });
      child.stdout.on('end', function() { callBack (resp) });
    }

    var packRepo = function (callback) {
      console.log(options.repoBranch);
      console.log(options.repoUrl); 

      run_cmd('ls', ['-lisa'], function(text) { console.log (text) });
      run_cmd('rm', ['-rf', './release'], function(text) {
        console.log (text) 
        run_cmd('git', ['clone', '-b', options.repoBranch, options.repoUrl, './release' ], function(text) {
          console.log (text) 
          run_cmd('tar', ['cfv', 'release.tar','./release' ], function(text) {
            console.log (text)
            callback();
          });
        });
      });
    }

    // var sendRelease =  function (packageName) {
    //   taskChain = '';
    //   addTask()
    //   return taskChain;
    // }

    var symlink = function () {

    }

    var deploy = function (connection) {
      connection.sftp(function(err, sftp) {
        if (err) throw err;
        sftp.on('end', function() {
          console.log('SFTP :: SFTP session closed');
        });
        sftp.fastPut('release.tar', '/var/www/project', function readdir(err, handle) {
          if (err) throw err;
          sftp.readdir(handle, function(err, list) {
            if (err) throw err;
            if (list === false) {
              sftp.close(handle, function(err) {
                if (err) throw err;
                console.log('SFTP :: Handle closed');
                sftp.end();
              });
              return;
            }
            console.dir(list);
            readdir(undefined, handle);
          });
        });
      });
    }

    var execute = function(connection, tasks) {

      console.log(tasks);

      var exec = function (connection, cmd) {
        connection.exec(cmd, function(err, stream) {
          if (err) throw err;
          stream.on('data', function(data, extended) {
            console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')
                        + data);
          });
          stream.on('end', function() {
            console.log('Stream :: EOF');
          });
          stream.on('close', function() {
            console.log('Stream :: close');
          });
          stream.on('exit', function(code, signal) {
            console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
            connection.end();
          });
        });
      }
      
      exec(connection, tasks);
    };

    function rollback(release) {

    }

    function connectServers (servers) {
      async.forEach(servers, function(serv) {
        var c = new ssh();
        
        c.on('connect', function() {
          console.log('Connecting to server: ' + serv);
        });
        c.on('ready', function() {
          console.log('Connected to server: ' + serv);
          deploy(c);
          //c.end();//execSingleServer(server,c);
        });
        c.on('error', function(err) {
          console.log("Error on server: " + serv)
          console.error(err);
          if (err) {throw err;}
        });
        c.on('close', function(had_error) {
          console.log("Closed connection for server: " + serv);
          //checkCompleted();
        });
       
        c.connect({
          host: serv,
          port: options.port,
          username: options.connection.username,
          privateKey: require('fs').readFileSync(options.connection.privateKeyPath),
          passphrase: options.connection.passphrase,
        });
        //c.end();
      });
    }
    packRepo(connectServers(server));
   // connectServers(server);

  });

};
