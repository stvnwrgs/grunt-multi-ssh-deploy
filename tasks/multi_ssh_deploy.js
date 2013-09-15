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
    
    var packRepo = function () 
    {

      taskChain = '';
      addTask('rm -rf ./release');
      addTask('git clone -b ' + options.repoBranchs + ' ' + options.repoUrl + ' ./release');
      addTask('tar cfv release.tar ./release');
      return task
    }

    var sendRelease =  function () {
      taskChain = '';

      return taskChain;
    }

    var symlink = function () {

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

    function connectServers (servers, task) {
      async.forEach(servers, function(serv) {
        var c = new ssh();
        
        c.on('connect', function() {
          console.log('Connecting to server: ' + serv);
        });
        c.on('ready', function() {
          console.log('Connected to server: ' + serv);
          execute(c,deploy());
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

    connectServers(server);

  });

};
