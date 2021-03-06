﻿(function () {
    "use strict";

    var app = angular.module("ProjectManagementModule");

    /**
     * @ngdoc service
     * @name ProjectManagementModule.service:projectStore
     * @description
     * store details of project entity of enterprise application
     * it is a middle level entity which communicate with low level
     * entities i.e. member-factory in order to provide data
     */

    app.service("projectStore", projectStore);

    /*@ngInject*/
    function projectStore($http, $q, projectFactory, memberFactory, utilsFactory, projectEntity) {

        var store = this;

        /* Iterations are better with Arrays */
        var _list = [];

        /* Lookups are faster with Object */
        var _lookup = {};

        /**
         * @ngdoc method
         * @name get
         * @methodOf ProjectManagementModule.service:projectStore
         * @description
         * it is a modal-store that retrieves a single project or members
         * of a project with a given project Id
         *
         * @param {Number} projectId Project Id
         * @param {String} queryParams query parameters
         * @returns {Object} promise
         */

        store.get = function (projectId, queryParams) {
            var deferred, promises, promise, project, members;

            queryParams = queryParams || [];

            deferred = $q.defer();
            promises = [];

            project = _lookup[projectId] || null;

            if (project) {
                /*
                 * Serve the cached version.
                 * What if project is a promise?
                 */
                if (utilsFactory.isPromise(project)) {
                    promises.push(project);
                }

            } else {
                promise = projectFactory.getProject(projectId)
                    .then(function (_project) {
                        project = projectEntity(_project);

                        _list.push(project);
                        _lookup[projectId] = project;
                    })
                    .catch(function () {
                        delete _lookup[projectId];

                        return $q.reject("");
                    });

                _lookup[projectId] = promise;
                promises.push(promise);
            }


            if (queryParams.indexOf("members") > -1) {
                promise = memberFactory.getProjectMembers(projectId)
                    .then(function (_members) {
                        members = _members;
                    });
                promises.push(promise);
            }

            $q.all(promises)
                .then(function () {
                    if (members) {
                        project.members = members;
                    }
                    deferred.resolve(project);
                });

            return deferred.promise;
        };

        /**
         * @ngdoc method
         * @name getAll
         * @methodOf ProjectManagementModule.service:projectStore
         * @description
         * retrieve details of all projects
         * @returns {Object} promise
         */

        store.getAll = function () {

            var deferred = $q.defer();

            if (store.getAll._calledBefore) {
                /* It is probably already called */

                if (utilsFactory.isPromise(store.getAll._calledBefore)) {
                    /* Some resource has already made a request.
                     * Use that same request
                     */
                    store.getAll._calledBefore
                        .then(function () {
                            deferred.resolve(_list);
                        });

                } else {
                    /* Serve cached version */
                    deferred.resolve(_list);
                }
            } else {

                /* Get the data from server.
                 * Keep reference of promise at _calledBefore until promise is resolved/rejected.
                 */
                store.getAll._calledBefore = projectFactory.getProjects()
                    .then(function (data) {

                        if (!_list) {
                            _list = [];
                        }

                        data.projects.forEach(function (item) {
                            var project;

                            project = projectEntity(item);

                            if (Object.hasOwnProperty(project.projectId) === false) {
                                _lookup[project.projectId] = project;
                                _list.push(project);
                            }

                        });

                        store.getAll._calledBefore = true;

                        deferred.resolve(_list);
                    })
                    .catch(function () {
                        _list = [];
                        store.getAll._calledBefore = false;
                        deferred.reject({});
                    });
            }

            return deferred.promise;
        };

        /*
         * projectInfo - name, description, members
         */
        store.add = function (projectInfo) {
            var deferred;

            deferred = $q.defer();

            projectFactory.addProject(projectInfo)
                .then(function (_project) {

                    var project = projectEntity(_project);

                    _lookup[project.projectId] = project;
                    _list.push(project);

                    deferred.resolve();

                })
                .catch(function (error) {
                    deferred.reject(error);
                });

            return deferred.promise;
        };

        store.update = function (projectInfo) {
            var deferred = $q.defer(), project;

            store.get(projectInfo.projectId, ["members"])
                .then(function (_project) {
                    var request;

                    project = _project;

                    request = {
                        projectId: project.projectId
                    };

                    /* Check if project name is changed */
                    if (project.name !== projectInfo.name) {
                        request.name = projectInfo.name;
                    }

                    /* Check if project description is changed */
                    if (project.description !== projectInfo.description) {
                        request.description = projectInfo.description;
                    }

                    return projectFactory.updateProject(request);

                })
                .then(function () {

                    var promises, membersToAdd = [], membersToDelete = [], _members;

                    /* Update name */
                    if (projectInfo.name) {
                        project.name = projectInfo.name;
                    }

                    /* Update description */
                    if (projectInfo.description) {
                        project.description = projectInfo.description;
                    }

                    /*
                        This is tricky solution - n^2 complexity
                        Mathematical set intersection operation.
                    */
                    if (projectInfo.members) {

                        _members = project.members.map(function (member) {
                            return member.value;
                        });

                        membersToDelete = utilsFactory.setSubstraction(_members, projectInfo.members);
                        membersToAdd = utilsFactory.setSubstraction(projectInfo.members, _members);
                    }

                    promises = membersToDelete.map(function (memberValue) {
                        return memberFactory.removeProjectMember(project.projectId, memberValue);
                    });

                    Array.prototype.push.apply(promises, membersToAdd.map(function (memberValue) {
                        return memberFactory.addProjectMember(project.projectId, memberValue);
                    }));

                    return $q.all(promises)
                        .catch(function () {
                            return $q.reject({
                                reasons: ["Member could not be updated."]
                            });
                        });

                })
                .then(function () {
                    deferred.resolve();
                })
                .catch(function (error) {
                    deferred.reject(error);
                });


            return deferred.promise;
        };


    }

})();
