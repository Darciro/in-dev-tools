/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

(function ($) {
    $(document).ready(function () {
        integerDevTools.init();
    });

    let integerDevTools = {
        init: function () {
            if( $('#auth-form').length ) {
                this.auth();
                return;
            }

            this.utils();
            this.projectSearch();
            this.projectsAccordion();
        },

        utils: function () {
            const $body = $('body');
            $('#start-devilbox').on('click', () => {
                window.inDevTools.startDevilbox();
            })

            $body.on('click', '.open-ide', (event) => {
                const $button = $(event.target),
                    ide = $button.attr('data-ide'),
                    target = $button.attr('data-ide-target');

                window.inDevTools.openIDE(ide, target);
            })

            $('#project-search').trigger('focus')
        },

        auth: function () {
            $('#auth-button').on('click', () => {
                const email = $('#email-integer').val();
                const token = $('#personal-token').val();
                const authData = {
                    'email' : email,
                    'token' : token,
                };
                const $feedbackBox = $('#error-feedback');
                $feedbackBox.removeClass('d-block')
                window.inDevTools.auth(authData).then((connected) => {
                    console.log(connected)
                    if(connected) {
                        $feedbackBox.removeClass('d-block')
                    } else {
                        $feedbackBox.addClass('d-block')
                    }
                })
            })
        },

        projectSearch: function () {
            const $projectSearchInput = $('#project-search');
            const $projectsMainAccordion = $('#projects-accordion');
            $projectSearchInput.on('keyup', () => {
                let input = $projectSearchInput.val().toUpperCase();

                $projectsMainAccordion.find('.accordion-item').each(function() {
                    if ($(this).text().toUpperCase().search(input) > -1) {
                        $(this).show();
                    }
                    else {
                        $(this).hide();
                    }
                });
            })
        },

        projectsAccordion: function () {
            const getProjects = window.inDevTools.getProjects(), $body = $('body');
            getProjects.then((projectData) => {
                const projects = projectData.value;
                const $projectsMainAccordion = $('#projects-accordion');
                const $projectAccordionTemplate = $projectsMainAccordion.find('.accordion-item').clone();
                let i = 0;

                $projectsMainAccordion.find('.accordion-item').remove();

                // Sort array of objects alphabetically by string property value
                projects.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))

                $.map(projects, function (projectInfo) {
                    let $projectAccordion = $projectAccordionTemplate.clone();

                    window.inDevTools.getSingleProject(projectInfo.id).then((project) => {
                        if( i === 0 )
                            $projectAccordion.find('.accordion-collapse').addClass('show');

                        $projectAccordion.find('.accordion-header').attr('id', 'accordion-project-'+ project.id);
                        $projectAccordion.find('.accordion-header button').text(project.name).attr('data-bs-target', '#accordion-project-collapse-'+ project.id);
                        $projectAccordion.find('.accordion-collapse').attr('id', 'accordion-project-collapse-'+ project.id);

                        if( project.description )
                            $projectAccordion.find('.accordion-body p.desc').text(project.description);

                        $projectAccordion.find('.list-group .project-link').attr('href', project._links.web.href);
                        $projectAccordion.find('.list-group .repo-link').attr('href', project._links.web.href +'/_git');
                        $projectAccordion.find('.list-group .backlog-link').attr('href', project._links.web.href +'/_backlogs');
                        $projectAccordion.find('.list-group .wiki-link').attr('href', project._links.web.href +'/_wiki');
                        $projectAccordion.find('.table').attr('table-project-id', project.id);
                        $projectAccordion.find('.modal-anchor').attr('data-bs-target', '#modal-project-'+ project.id);
                        $projectAccordion.find('.modal').attr('id', 'modal-project-'+ project.id);

                        window.inDevTools.getProjectLocalFile(project.id).then((fileData) => {
                            if( !fileData )
                                return;

                            const fileLines = fileData.split("\n");
                            $.each(fileLines, function(i, line){
                                if( line.length === 0 )
                                    return;

                                const cols = line.split('=');
                                const colName = cols[0];
                                const colURL = cols[1];

                                if( colName === 'local-path' ) {
                                    $projectAccordion.find('.open-ide').attr('data-ide-target', colURL).removeClass('d-none');
                                }

                                const link = '<a href="'+ colURL +'" target="_blank" class="list-group-item list-group-item-action">'+ colName +'</a>';
                                let tr = '<tr>';
                                tr += '<th scope="row">'
                                tr += '    <span>'+ colName +'</span>'
                                tr += '    <input type="text" class="form-control custom-name-input" value="'+ colName +'">'
                                tr += '</th>'
                                tr += '<td>'
                                tr += '    <span>'+ colURL +'</span>'
                                tr += '    <input type="text" class="form-control custom-url-input" value="'+ colURL +'">'
                                tr += '</td>'
                                tr += '<td class="text-end">'
                                tr += '    <button type="button" class="delete-custom-data btn btn-danger btn-sm">Excluir</button>'
                                tr += '    <button type="button" class="edit-custom-data btn btn-warning btn-sm">Editar</button>'
                                tr += '    <button type="button" class="cancel-custom-data btn btn-secondary btn-sm">Cancelar</button>'
                                tr += '    <button type="button" class="save-custom-data btn btn-success btn-sm">Salvar</button>'
                                tr += '</td>'
                                tr += '</tr>'

                                $projectAccordion.find('.list-group').append(link);
                                $projectAccordion.find('.table').append(tr)
                            });
                        })

                        $projectsMainAccordion.append($projectAccordion);
                        i++;
                    });

                });
            })

            $body.on('click', '.add-custom-data', (event) => {
                const $table = $(event.target).closest('table')
                const $rowTemplate = $table.find('.row-template').clone();
                $table.find('tbody').append($rowTemplate);
                $rowTemplate.removeClass('row-template d-none').addClass('active');
            })

            $body.on('click', '.edit-custom-data, .cancel-custom-data', (event) => {
                const $tr = $(event.target).closest('tr');
                $tr.toggleClass('active')
            })

            $body.on('click', '.save-custom-data', (event) => {
                const dataTable = $(event.target).closest('table');
                const projectID = dataTable.attr('table-project-id');
                const $tr = $(event.target).closest('tr');
                const customNameInput = $tr.find('.custom-name-input').val();
                const customURLInput = $tr.find('.custom-url-input').val();

                $tr.find('th span').text(customNameInput);
                $tr.find('td:eq(0) span').text(customURLInput);
                $tr.removeClass('active')

                let customData = '';
                dataTable.find('> tbody  > tr').not('.row-template').each(function(i, tr) {
                    const customName = $(tr).find('th span').text();
                    const customURL = $(tr).find('td:eq(0) span').text();
                    const formattedString = customName + '=' + customURL + '\n';

                    customData += formattedString;
                });

                window.inDevTools.setProjectLocalFile(projectID, customData);
            })
        },

    };
})(jQuery);
