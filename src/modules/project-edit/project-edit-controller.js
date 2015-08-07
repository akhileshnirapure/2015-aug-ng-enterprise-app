(function () {
    "use strict";

    var app = angular.module("ProjectManagementModule");

    app.controller("ProjectManagerController", ProjectManagerController);

    /*@ngInject*/
    function ProjectManagerController($state, $stateParams, STATES, projectStore) {

        var stateName, projectId;

        /* controller instance */
        var vm = this;

        /* Bindable members declaration */
        vm.heading = "";
        vm.members = [];
        vm.isEditMode = null;
        vm.saveProject = saveProject;

        init();
        getProjectDetails();

        /* Public members */
        function saveProject() {

            /* Do form validations at this level */
            if (vm.isEditMode) {
                updateProject();
            } else {
                addProject();
            }
        }

        /* Private members */
        function init() {

            vm.members = [{
                display: "Debjit Biswas",
                value: "debjit",
                isMember: false
            }, {
                display: "Harshal Patil",
                value: "harshal",
                isMember: false
            }, {
                display: "Kumar Bhot",
                value: "kumar",
                isMember: false
            }, {
                display: "Niloy Mondal",
                value: "niloy",
                isMember: false
            }];

            stateName = $state.current.name;

            if (stateName === STATES.PROJECT_EDIT) {
                vm.isEditMode = true;
                vm.heading = "Edit Project";

                if ($stateParams.projectId) {
                    projectId = $stateParams.projectId;
                } else {
                    $state.go(STATES.ERROR);
                    return;
                }

            } else if (stateName === STATES.PROJECT_ADD) {
                vm.isEditMode = false;
                vm.heading = "Add Project";
            } else {
                $state.go(STATES.ERROR);
                return;
            }

        }

        function getProjectDetails() {
            if (vm.isEditMode) {

                projectStore.get(projectId, ["members"])
                    .then(function (projectData) {

                        vm.project = projectData;
                        vm.newProjectName = projectData.name;
                        vm.newDescription = projectData.description;

                        projectData.members.forEach(function (member) {

                            vm.members.some(function (_member) {
                                if (member.value === _member.value) {
                                    _member.isMember = member.isMember;

                                    return true;
                                } else {
                                    return false;
                                }
                            });

                        });

                    });
            }
        }

        function updateProject() {
        }

        function addProject() {

            var request = {
                name: vm.newProjectName,
                description: vm.newDescription,
                members: null
            };

            request.members = vm.members.reduce(function (list, member) {
                if (member.isMember) {
                    list.push(member.value);
                }
            }, []);

            return projectStore.add(request);

        }
    }

}());
