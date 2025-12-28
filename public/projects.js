/**
 * projects.js
 * Handles Project Management logic (V2 Schema).
 */

const Projects = {
    currentProjectId: null,

    /**
     * Initialize projects for new session - auto-create Default Project
     * @param {string} sessionId 
     * @returns {Promise<string>} projectId of default project
     */
    async initialize(sessionId) {
        try {
            // Check if any projects exist
            const projectsSnapshot = await db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .limit(1)
                .get();

            if (projectsSnapshot.empty) {
                // Create Default Project
                const defaultProjectId = await this.create(
                    sessionId,
                    'Default Project',
                    { techStack: [], description: 'Your default debugging workspace' }
                );

                // Set as current
                await this.setCurrent(sessionId, defaultProjectId);
                return defaultProjectId;
            } else {
                // Load current project from session
                const sessionDoc = await db.collection('sessions').doc(sessionId).get();
                const currentId = sessionDoc.data()?.currentProjectId;

                if (currentId) {
                    this.currentProjectId = currentId;
                    return currentId;
                } else {
                    // Fallback: use first project
                    const firstProject = projectsSnapshot.docs[0];
                    await this.setCurrent(sessionId, firstProject.id);
                    return firstProject.id;
                }
            }
        } catch (error) {
            console.error('Failed to initialize projects:', error);
            throw error;
        }
    },

    /**
     * Create new project
     * @param {string} sessionId 
     * @param {string} projectName 
     * @param {object} context 
     * @returns {Promise<string>} projectId
     */
    async create(sessionId, projectName, context = {}) {
        try {
            // Validate project name
            if (!projectName || projectName.trim().length === 0) {
                throw new Error('Project name is required');
            }

            if (projectName.length > 100) {
                throw new Error('Project name too long (max 100 characters)');
            }

            const projectRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(); // Auto-generate ID

            await projectRef.set({
                projectName: projectName.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                context: {
                    techStack: context.techStack || [],
                    description: context.description || ''
                }
            });

            console.log(`✅ Created project: ${projectName} (${projectRef.id})`);
            return projectRef.id;
        } catch (error) {
            console.error('Failed to create project:', error);
            throw error;
        }
    },

    /**
     * List all projects for session
     * @param {string} sessionId 
     * @returns {Promise<Array>} projects [{id, name, createdAt, context}]
     */
    async list(sessionId) {
        try {
            const snapshot = await db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().projectName,
                createdAt: doc.data().createdAt,
                context: doc.data().context || {}
            }));
        } catch (error) {
            console.error('Failed to list projects:', error);
            return [];
        }
    },

    /**
     * Alias for list() to support cross-project insights
     * @param {string} sessionId
     * @returns {Promise<Array>} projects
     */
    async getAllProjects(sessionId) {
        return this.list(sessionId);
    },

    /**
     * Set current active project
     * @param {string} sessionId 
     * @param {string} projectId 
     */
    async setCurrent(sessionId, projectId) {
        try {
            await db.collection('sessions')
                .doc(sessionId)
                .update({ currentProjectId: projectId });

            this.currentProjectId = projectId;
            console.log(`✅ Switched to project: ${projectId}`);
        } catch (error) {
            console.error('Failed to set current project:', error);
            throw error;
        }
    },

    /**
     * Get current project ID
     * @returns {string|null} projectId
     */
    getCurrent() {
        return this.currentProjectId;
    },

    /**
     * Update project metadata
     * @param {string} sessionId 
     * @param {string} projectId 
     * @param {object} updates 
     */
    async update(sessionId, projectId, updates) {
        try {
            const projectRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId);

            await projectRef.update(updates);
            console.log(`✅ Updated project: ${projectId}`);
        } catch (error) {
            console.error('Failed to update project:', error);
            throw error;
        }
    },
    /**
     * Delete a project and all its data
     * @param {string} sessionId 
     * @param {string} projectId 
     */
    async delete(sessionId, projectId) {
        try {
            // Safety check: Don't allow deleting current project
            if (this.currentProjectId === projectId) {
                // Switch to another project first
                const allProjects = await this.list(sessionId);
                const otherProject = allProjects.find(p => p.id !== projectId);

                if (!otherProject) {
                    throw new Error('Cannot delete the only project. Create another project first.');
                }

                await this.setCurrent(sessionId, otherProject.id);
            }

            // Delete the project document
            const projectRef = db.collection('sessions')
                .doc(sessionId)
                .collection('projects')
                .doc(projectId);

            await projectRef.delete();
            console.log(`✅ Deleted project: ${projectId}`);

            return true;
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
        }
    }
};

// Export globally
if (typeof window !== 'undefined') {
    window.Projects = Projects;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Projects };
}
